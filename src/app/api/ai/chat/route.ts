import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Configure max duration for serverless (Vercel)
export const maxDuration = 60;

const OCR_DOCUMENT_CHAT_WEBHOOK_URL = 'https://n8n.mtb-app.com/webhook/d22c20c5-8813-4615-a35b-07a48fc97e12';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { message, query, context, conversationHistory } = body;
    const prompt = query || message;
    
    console.log('[AI CHAT API] Received body:', JSON.stringify({ message, query, context, hasContext: !!context }));
    
    if (!prompt) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const contextData = await buildContext(context);

    try {
      await prisma.activityLog.create({
        data: { userId: session.user.id!, userName: session.user.name!, action: 'ai_query', module: 'ai', details: 'Question: ' + prompt.substring(0, 100), aiInvolved: true },
      });
    } catch (logError) {
      console.error('[AI CHAT API] Failed to log activity:', logError);
      // Continue even if logging fails
    }

  if (context) {
    const payload = { query: prompt, context };
    console.log('[OCR DOC CHAT] Sending request to n8n webhook:', OCR_DOCUMENT_CHAT_WEBHOOK_URL);
    console.log('[OCR DOC CHAT] Payload:', JSON.stringify(payload));

    const n8nUser = process.env.N8N_USER;
    const n8nPassword = process.env.N8N_PASSWORD;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (n8nUser && n8nPassword) {
      const auth = Buffer.from(`${n8nUser}:${n8nPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
      console.log('[OCR DOC CHAT] Using Basic auth with user:', n8nUser);
    }

    try {
      console.log('[OCR DOC CHAT] Starting fetch to n8n...');
      const documentWebhookResponse = await fetch(OCR_DOCUMENT_CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      console.log('[OCR DOC CHAT] n8n response received, status:', documentWebhookResponse.status);
      const responseText = await documentWebhookResponse.text();
      console.log('[OCR DOC CHAT] n8n raw response length:', responseText.length);
      console.log('[OCR DOC CHAT] n8n raw response preview:', responseText.substring(0, 500));

      if (!documentWebhookResponse.ok) {
        console.error('[OCR DOC CHAT] n8n returned error status:', documentWebhookResponse.status);
        return NextResponse.json(
          { error: `Webhook n8n OCR en échec (${documentWebhookResponse.status})`, details: responseText },
          { status: 502 }
        );
      }

      // Check if response is JSON or raw HTML
      let finalResponse: string;
      
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(responseText);
          console.log('[OCR DOC CHAT] Parsed JSON response keys:', Object.keys(parsed));
          finalResponse = parsed?.output || parsed?.response || parsed?.text || parsed?.html || parsed?.content || responseText;
        } catch {
          console.log('[OCR DOC CHAT] Failed to parse as JSON, using raw text');
          finalResponse = responseText;
        }
      } else {
        // Raw HTML or text response
        console.log('[OCR DOC CHAT] Using raw HTML/text response');
        finalResponse = responseText;
      }

      if (!finalResponse || finalResponse.trim() === '') {
        console.error('[OCR DOC CHAT] Empty response from n8n');
        return NextResponse.json(
          { error: 'Réponse vide du webhook n8n' },
          { status: 502 }
        );
      }

      console.log('[OCR DOC CHAT] Final response length:', finalResponse.length);
      return NextResponse.json({ response: finalResponse, actions: detectActions(finalResponse), source: 'n8n' });
    } catch (error: any) {
      console.error('[OCR DOC CHAT] Webhook call failed with error:', error?.name, error?.message);
      
      if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Timeout: le webhook n8n met trop de temps à répondre (plus de 60 secondes)', details: 'Vérifiez que le workflow n8n est actif et optimisé' },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { error: 'Impossible de joindre le webhook n8n OCR', details: error?.message || 'Erreur inconnue' },
        { status: 502 }
      );
    }
  }

  // Try n8n webhook first
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const n8nUser = process.env.N8N_USER;
  const n8nPassword = process.env.N8N_PASSWORD;
  
  if (webhookUrl) {
    try {
      // Préparer les headers avec authentification Basic si disponible
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (n8nUser && n8nPassword) {
        const auth = Buffer.from(`${n8nUser}:${n8nPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: prompt, context: context || null, contextData, user: { name: session.user.name, role: (session.user as any).role }, history: conversationHistory || [] }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        const responseText = data.output || data.response || data.text || JSON.stringify(data);
        return NextResponse.json({ response: responseText, actions: detectActions(responseText), source: 'n8n' });
      }
    } catch { /* fallback */ }
  }

  const response = generateLocalResponse(prompt, contextData);
  return NextResponse.json({ response, actions: detectActions(response), source: 'fallback' });
  } catch (error: any) {
    console.error('[AI CHAT API] Global error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error?.message || 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

async function buildContext(documentId?: string) {
  if (documentId) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        invoiceNumber: true,
        poNumber: true,
        amountHt: true,
        amountTva: true,
        amountTtc: true,
        ocrStatus: true,
        ocrConfidence: true,
        pipelineStage: true,
        reconciliationStatus: true,
        variances: true,
        isDeleted: true,
        supplier: { select: { name: true, code: true } },
        uploadedBy: { select: { fullName: true } },
        assignedTo: { select: { fullName: true } },
        // Exclude fileBase64 to prevent memory/timeout issues
      },
    });

    if (document && !document.isDeleted) {
      return {
        mode: 'document',
        document: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          mimeType: document.mimeType,
          supplier: document.supplier?.name || 'Inconnu',
          supplierCode: document.supplier?.code || null,
          invoiceNumber: document.invoiceNumber,
          poNumber: document.poNumber,
          amountHt: document.amountHt,
          amountTva: document.amountTva,
          amountTtc: document.amountTtc,
          ocrStatus: document.ocrStatus,
          ocrConfidence: document.ocrConfidence,
          pipelineStage: document.pipelineStage,
          reconciliationStatus: document.reconciliationStatus,
          variances: document.variances || [],
          uploadedBy: document.uploadedBy?.fullName || null,
          assignedTo: document.assignedTo?.fullName || null,
        },
      };
    }
  }

  const [suppliers, orders, anomalies, materials, negotiations] = await Promise.all([
    prisma.supplier.findMany({ where: { isDeleted: false }, select: { name: true, code: true, scoreGlobal: true, status: true, riskLevel: true, volumeYtd: true, trend: true, dependencyRatio: true, incidentsCount: true }, orderBy: { volumeYtd: 'desc' }, take: 15 }),
    prisma.order.findMany({ where: { isDeleted: false, status: { notIn: ['received','closed'] } }, select: { poNumber: true, isLate: true, delayDays: true, riskOfStockout: true, totalAmount: true, poleId: true }, orderBy: { delayDays: 'desc' }, take: 10 }),
    prisma.anomaly.findMany({ where: { isDeleted: false, status: { in: ['open','investigating'] } }, select: { title: true, category: true, severity: true, financialImpact: true, priority: true }, orderBy: { priority: 'asc' }, take: 10 }),
    prisma.rawMaterial.findMany({ where: { isDeleted: false }, select: { name: true, currentPrice: true, variationPct: true, trend: true, alertType: true }, take: 8 }),
    prisma.negotiation.findMany({ where: { isDeleted: false, status: { in: ['preparation','in_progress','pending_decision'] } }, select: { subject: true, status: true, financialStake: true, targetSavings: true }, take: 5 }),
  ]);

  const lateOrders = orders.filter(o => o.isLate);
  const criticals = anomalies.filter(a => a.severity === 'critical');
  const riskSups = suppliers.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high');
  const impact = anomalies.reduce((s, a) => s + (a.financialImpact || 0), 0);

  return {
    summary: { activeSuppliers: suppliers.length, riskSuppliers: riskSups.length, pendingOrders: orders.length, lateOrders: lateOrders.length, ruptureRisk: orders.filter(o => o.riskOfStockout).length, openAnomalies: anomalies.length, criticalAnomalies: criticals.length, totalFinancialImpact: impact, activeNegotiations: negotiations.length, opportunities: materials.filter(m => m.alertType === 'opportunity').length },
    suppliers: suppliers.slice(0, 10).map(s => `${s.name} (${s.code}): score=${s.scoreGlobal}, risk=${s.riskLevel}, vol=${Math.round(s.volumeYtd / 1000000)}M, dep=${s.dependencyRatio}%`),
    lateOrders: lateOrders.map(o => `${o.poNumber}: retard +${o.delayDays}j, pôle ${o.poleId}${o.riskOfStockout ? ' ⚠RUPTURE' : ''}`),
    criticalAnomalies: criticals.map(a => `P${a.priority} ${a.category}: ${a.title} (impact: ${a.financialImpact?.toLocaleString('fr-FR') || '?'} FCFA)`),
    negotiations: negotiations.map(n => `${n.subject}: ${n.status}, enjeu ${Math.round(n.financialStake / 1000000)}M FCFA`),
    materials: materials.map(m => `${m.name}: ${m.currentPrice} (${m.variationPct > 0 ? '+' : ''}${m.variationPct}%) ${m.alertType}`),
  };
}

function generateLocalResponse(message: string, ctx: any): string {
  const msg = message.toLowerCase();

  if (ctx?.mode === 'document' && ctx.document) {
    const doc = ctx.document;
    const variances = Array.isArray(doc.variances) ? doc.variances : [];
    const varianceLines = variances.length > 0
      ? variances.map((v: any) => `* ${v.field || 'écart'}${v.diff_pct != null ? `: ${v.diff_pct}%` : ''}${v.severity ? ` (${v.severity})` : ''}`).join('\n')
      : '* Aucun écart structuré enregistré';

    return `**Résumé**\nDocument ${doc.fileName} (${doc.fileType}) actuellement à l'étape ${doc.pipelineStage}/7, statut OCR ${doc.ocrStatus}, statut de rapprochement ${doc.reconciliationStatus}. Fournisseur: ${doc.supplier}. Montant TTC: ${doc.amountTtc?.toLocaleString('fr-FR') || 'non disponible'}.\n\n**Points critiques / Anomalies**\n${varianceLines}\n\n**Recommandations**\n* Répondre strictement à la question posée en s'appuyant sur ce document\n* Vérifier les champs extraits avant validation finale\n* Escalader si un écart majeur ou bloquant est confirmé`;
  }

  if (msg.includes('rupture') || msg.includes('stock'))
    return ctx.summary.ruptureRisk > 0
      ? `**Résumé**\n${ctx.summary.ruptureRisk} commande(s) présentent un risque de rupture de stock imminent.\n\n**Points critiques / Anomalies**\n` + ctx.lateOrders.filter((o: string) => o.includes('RUPTURE')).map((o: string) => `* ${o}`).join('\n') + `\n\n**Recommandations**\n* Relancer immédiatement les fournisseurs concernés\n* Vérifier les stocks de sécurité\n* Identifier des sources alternatives d'approvisionnement\n* Prévenir les pôles impactés`
      : `**Résumé**\nAucun risque de rupture identifié actuellement.\n\n**Recommandations**\n* Continuer le monitoring des stocks\n* Maintenir les alertes proactives`;

  if (msg.includes('anomal') || msg.includes('alerte') || msg.includes('problème'))
    return `**Résumé**\n${ctx.summary.openAnomalies} anomalies ouvertes dont ${ctx.summary.criticalAnomalies} critiques. Impact total: ${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA.\n\n**Points critiques / Anomalies**\n` + ctx.criticalAnomalies.map((a: string) => `* ${a}`).join('\n') + `\n\n**Recommandations**\n* Traiter les P1 en priorité absolue\n* Programmer les entretiens avec les fournisseurs\n* Documenter les résolutions pour capitalisation`;

  if (msg.includes('fournisseur') || msg.includes('scoring') || msg.includes('risque'))
    return `**Résumé**\n${ctx.summary.activeSuppliers} fournisseurs actifs, ${ctx.summary.riskSuppliers} identifiés à risque.\n\n**Points critiques / Anomalies**\n` + ctx.suppliers.filter((s: string) => s.includes('risk=critical') || s.includes('risk=high')).map((s: string) => `* ${s}`).join('\n') + `\n\n**Recommandations**\n* Planifier des audits pour les fournisseurs critiques\n* Diversifier les sources d'approvisionnement\n* Renégocier les contrats à risque`;

  if (msg.includes('économi') || msg.includes('saving') || msg.includes('optimis'))
    return `**Résumé**\nPotentiel d'économies: ${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA via résolution anomalies, ${ctx.summary.opportunities} opportunités matières, ${ctx.summary.activeNegotiations} négociations en cours.\n\n**Points critiques / Anomalies**\n* Anomalies prix: ${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA récupérables\n` + ctx.materials.filter((m: string) => m.includes('opportunity')).map((m: string) => `* ${m}`).join('\n') + `\n\n**Recommandations**\n* Prioriser les négociations à fort enjeu\n* Exploiter les baisses de prix matières\n* Documenter les gains réalisés`;

  if (msg.includes('commande') || msg.includes('retard') || msg.includes('livraison'))
    return `**Résumé**\n${ctx.summary.pendingOrders} commandes en cours, ${ctx.summary.lateOrders} en retard.\n\n**Points critiques / Anomalies**\n` + ctx.lateOrders.map((o: string) => `* ${o}`).join('\n') + `\n\n**Recommandations**\n* Relancer les commandes > 7 jours retard\n* Escalader les commandes > 15 jours retard\n* Mettre à jour les délais prévisionnels`;

  if (msg.includes('négo') || msg.includes('contrat'))
    return `**Résumé**\n${ctx.summary.activeNegotiations} négociation(s) active(s).\n\n**Points critiques / Anomalies**\n` + ctx.negotiations.map((n: string) => `* ${n}`).join('\n') + `\n\n**Recommandations**\n* Préparer les arguments pour chaque négociation\n* Définir les limites de concession\n* Planifier les réunions de validation`;

  if (msg.includes('matière') || msg.includes('marché') || msg.includes('prix') || msg.includes('cours'))
    return `**Résumé**\nVeille matières premières: ${ctx.materials.length} matières suivies.\n\n**Points critiques / Anomalies**\n` + ctx.materials.map((m: string) => `* ${m}`).join('\n') + `\n\n**Recommandations**\n* Anticiper les hausses de prix\n* Verrouiller les contrats sur les matières en baisse\n* Adapter les stratégies d'achat`;

  // Default summary
  return `**Résumé**\nTableau de bord: ${ctx.summary.activeSuppliers} fournisseurs (${ctx.summary.riskSuppliers} à risque), ${ctx.summary.pendingOrders} commandes (${ctx.summary.lateOrders} retard, ${ctx.summary.ruptureRisk} rupture), ${ctx.summary.openAnomalies} anomalies (${ctx.summary.criticalAnomalies} critiques), ${ctx.summary.activeNegotiations} négociations. Impact: ${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA.\n\n**Points critiques / Anomalies**\n* ${ctx.summary.riskSuppliers} fournisseurs à surveiller\n* ${ctx.summary.criticalAnomalies} anomalies critiques à traiter\n* ${ctx.summary.ruptureRisk} risques de rupture\n\n**Recommandations**\n* Consulter les détails par module\n* Prioriser les actions critiques\n* Planifier les revues fournisseurs`;
}

function detectActions(response: string): { label: string; href: string }[] {
  const a: { label: string; href: string }[] = [];
  if (response.includes('rupture') || response.includes('commande')) a.push({ label: '📦 Commandes', href: '/orders' });
  if (response.includes('anomal') || response.includes('critique')) a.push({ label: '🛡️ Anomalies', href: '/audit' });
  if (response.includes('fournisseur') || response.includes('scoring')) a.push({ label: '🏢 Fournisseurs', href: '/suppliers' });
  if (response.includes('négoci')) a.push({ label: '🤝 Négociations', href: '/negotiations' });
  if (response.includes('matière') || response.includes('marché')) a.push({ label: '📊 Veille marché', href: '/sourcing' });
  if (response.includes('courrier') || response.includes('relance')) a.push({ label: '✉️ Courriers', href: '/letters' });
  return a.slice(0, 3);
}
