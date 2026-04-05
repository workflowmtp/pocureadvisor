import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, conversationHistory } = await req.json();
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const context = await buildContext();

  await prisma.activityLog.create({
    data: { userId: session.user.id!, userName: session.user.name!, action: 'ai_query', module: 'ai', details: 'Question: ' + message.substring(0, 100), aiInvolved: true },
  });

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
        body: JSON.stringify({ message, context, user: { name: session.user.name, role: (session.user as any).role }, history: conversationHistory || [] }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        const responseText = data.output || data.response || data.text || JSON.stringify(data);
        return NextResponse.json({ response: responseText, actions: detectActions(responseText), source: 'n8n' });
      }
    } catch { /* fallback */ }
  }

  const response = generateLocalResponse(message, context);
  return NextResponse.json({ response, actions: detectActions(response), source: 'fallback' });
}

async function buildContext() {
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

  if (msg.includes('rupture') || msg.includes('stock'))
    return ctx.summary.ruptureRisk > 0
      ? `⚠️ **${ctx.summary.ruptureRisk} commande(s) avec risque de rupture de stock.**\n\n` + ctx.lateOrders.filter((o: string) => o.includes('RUPTURE')).map((o: string) => `• ${o}`).join('\n') + `\n\n**Actions recommandées :**\n• Relancer immédiatement les fournisseurs\n• Vérifier les stocks de sécurité\n• Identifier des alternatives d'urgence`
      : '✅ Aucun risque de rupture identifié actuellement.';

  if (msg.includes('anomal') || msg.includes('alerte') || msg.includes('problème'))
    return `🛡️ **${ctx.summary.openAnomalies} anomalies ouvertes dont ${ctx.summary.criticalAnomalies} critiques.**\n\nImpact : **${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA**\n\n**Critiques :**\n` + ctx.criticalAnomalies.map((a: string) => `🔴 ${a}`).join('\n') + `\n\n**Actions :** Traiter les P1 en priorité, programmer les entretiens.`;

  if (msg.includes('fournisseur') || msg.includes('scoring') || msg.includes('risque'))
    return `🏢 **${ctx.summary.activeSuppliers} fournisseurs, ${ctx.summary.riskSuppliers} à risque.**\n\n**À risque :**\n` + ctx.suppliers.filter((s: string) => s.includes('risk=critical') || s.includes('risk=high')).map((s: string) => `⚠️ ${s}`).join('\n') + `\n\n**Top 5 :**\n` + ctx.suppliers.slice(0, 5).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');

  if (msg.includes('économi') || msg.includes('saving') || msg.includes('optimis'))
    return `💰 **Opportunités :**\n\n• **Anomalies prix** : ${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA récupérables\n• **Matières en baisse** : ${ctx.summary.opportunities} opportunité(s)\n• **Négociations** : ${ctx.summary.activeNegotiations} en cours\n\n` + ctx.materials.filter((m: string) => m.includes('opportunity')).map((m: string) => `📉 ${m}`).join('\n');

  if (msg.includes('commande') || msg.includes('retard') || msg.includes('livraison'))
    return `📦 **${ctx.summary.pendingOrders} commandes en cours, ${ctx.summary.lateOrders} en retard.**\n\n` + ctx.lateOrders.map((o: string) => `⏰ ${o}`).join('\n') + `\n\n**Actions :** Relancer > 7j, escalader > 15j.`;

  if (msg.includes('négo') || msg.includes('contrat'))
    return `🤝 **${ctx.summary.activeNegotiations} négociation(s) active(s) :**\n\n` + ctx.negotiations.map((n: string) => `• ${n}`).join('\n');

  if (msg.includes('matière') || msg.includes('marché') || msg.includes('prix') || msg.includes('cours'))
    return `📊 **Veille matières :**\n\n` + ctx.materials.map((m: string) => `${m.includes('risk') ? '📈⚠️' : m.includes('opportunity') ? '📉✅' : '→'} ${m}`).join('\n');

  // Default summary
  return `🤖 **ProcureBot — Résumé temps réel :**\n\n• **${ctx.summary.activeSuppliers}** fournisseurs (${ctx.summary.riskSuppliers} à risque)\n• **${ctx.summary.pendingOrders}** commandes (${ctx.summary.lateOrders} retard, ${ctx.summary.ruptureRisk} rupture)\n• **${ctx.summary.openAnomalies}** anomalies (${ctx.summary.criticalAnomalies} critiques)\n• **${ctx.summary.activeNegotiations}** négociations\n• Impact : **${ctx.summary.totalFinancialImpact.toLocaleString('fr-FR')} FCFA**\n\nQue souhaitez-vous analyser ?`;
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
