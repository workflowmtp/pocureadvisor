import { PrismaClient, SupplierStatus, RiskLevel, Trend, X3SyncStatus, CriticalLevel, OrderStatus, OcrStatus, ReconciliationStatus, Severity, AnomalyStatus, AlertType, AltSupplierStatus, NegotiationStatus, LetterType, LetterStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PERMISSIONS, DEFAULT_ROLES } from './permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ProcureAdvisor...');

  // ═══════════════════ CLEAN ═══════════════════
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.quoteComparison.deleteMany();
  await prisma.letter.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.alternativeSupplier.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.document.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.article.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.auditRule.deleteMany();
  await prisma.pole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.purchaseCategory.deleteMany();
  await prisma.setting.deleteMany();

  // ═══════════════════ PERMISSIONS ═══════════════════
  console.log('Creating permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.create({
      data: {
        code: perm.code,
        name: perm.name,
        category: perm.category,
      },
    });
  }
  console.log(`✅ Created ${PERMISSIONS.length} permissions`);

  // ═══════════════════ ROLES ═══════════════════
  console.log('Creating roles...');
  const roleMap: Record<string, string> = {};
  for (const roleData of DEFAULT_ROLES) {
    const role = await prisma.role.create({
      data: {
        code: roleData.code,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    });
    roleMap[roleData.code] = role.id;

    // Assign permissions to role
    if (roleData.permissions === '*') {
      // Admin gets all permissions
      const allPerms = await prisma.permission.findMany();
      for (const perm of allPerms) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    } else {
      // Specific permissions
      for (const permCode of roleData.permissions) {
        const perm = await prisma.permission.findUnique({ where: { code: permCode } });
        if (perm) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }
      }
    }
  }
  console.log(`✅ Created ${Object.keys(roleMap).length} roles`);

  // ═══════════════════ USERS ═══════════════════
  const pw = await hash('demo2025', 12);

  const users = await Promise.all([
    prisma.user.create({ data: { username: 'admin', passwordHash: pw, fullName: 'Administrateur Système', email: 'admin@multiprint.cm', roleId: roleMap['admin'], avatar: 'AS', poleIds: ['OE','HF','OC','BC'], loginCount: 234 } }),
    prisma.user.create({ data: { username: 'd.moukoko', passwordHash: pw, fullName: 'Daniel Moukoko', email: 'd.moukoko@multiprint.cm', roleId: roleMap['dir_achat'], avatar: 'DM', poleIds: ['OE','HF','OC','BC'], loginCount: 189 } }),
    prisma.user.create({ data: { username: 'a.ngo', passwordHash: pw, fullName: 'Alice Ngo Bassa', email: 'a.ngo@multiprint.cm', roleId: roleMap['acheteur'], avatar: 'AN', poleIds: ['HF','OE'], loginCount: 156 } }),
    prisma.user.create({ data: { username: 'c.fotso', passwordHash: pw, fullName: 'Christian Fotso', email: 'c.fotso@multiprint.cm', roleId: roleMap['comptable'], avatar: 'CF', poleIds: ['OE','HF','OC','BC'], loginCount: 142 } }),
    prisma.user.create({ data: { username: 'm.eyanga', passwordHash: pw, fullName: 'Marcel Eyanga', email: 'm.eyanga@multiprint.cm', roleId: roleMap['magasin'], avatar: 'ME', poleIds: ['HF','OC'], loginCount: 98 } }),
    prisma.user.create({ data: { username: 'i.nguema', passwordHash: pw, fullName: 'Irène Nguema', email: 'i.nguema@multiprint.cm', roleId: roleMap['audit'], avatar: 'IN', poleIds: ['OE','HF','OC','BC'], loginCount: 78 } }),
    prisma.user.create({ data: { username: 'direction', passwordHash: pw, fullName: 'Direction Générale', email: 'dg@multiprint.cm', roleId: roleMap['dg'], avatar: 'DG', poleIds: ['OE','HF','OC','BC'], loginCount: 45 } }),
    prisma.user.create({ data: { username: 'consultant', passwordHash: pw, fullName: 'Consultant Externe', email: 'consultant@ext.cm', roleId: roleMap['consult'], avatar: 'CE', poleIds: ['OE','HF','OC','BC'], loginCount: 12 } }),
  ]);

  const [admin, dirAchat, acheteur, comptable, magasinier, auditeur, dg, consultant] = users;

  // ═══════════════════ POLES ═══════════════════
  await prisma.pole.createMany({
    data: [
      { code: 'OE', name: 'Offset Étiquette', color: '#3B82F6', managerId: acheteur.id },
      { code: 'HF', name: 'Héliogravure Flexible', color: '#8B5CF6', managerId: acheteur.id },
      { code: 'OC', name: 'Offset Carton', color: '#06B6D4', managerId: acheteur.id },
      { code: 'BC', name: 'Bouchon Couronne', color: '#F59E0B', managerId: acheteur.id },
    ],
  });

  // ═══════════════════ CATEGORIES ═══════════════════
  const categories = await Promise.all([
    prisma.purchaseCategory.create({ data: { code: 'cat01', name: 'Encres', families: ['Encres hélio','Encres offset','Encres spéciales'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat02', name: 'Solvants & Colles', families: ['Solvants','Colles','Additifs'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat03', name: 'Films & Supports', families: ['Film BOPP','Film PET','Film PE','Aluminium'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat04', name: 'Carton', families: ['Carton compact GC1','Carton GC2','Carton ondulé'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat05', name: 'Métal', families: ['Fer blanc','Compounds','Joints'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat06', name: 'Résines', families: ['PE HD','PE BD','PP'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat07', name: 'Consommables production', families: ['Plaques','Blanchets','Cylindres','Vernis'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat08', name: 'Pièces détachées', families: ['Mécanique','Électrique','Pneumatique'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat09', name: 'Prestations', families: ['Transport','Maintenance externe','Analyses labo'] } }),
    prisma.purchaseCategory.create({ data: { code: 'cat10', name: 'Fournitures générales', families: ['Bureau','EPI','Nettoyage'] } }),
  ]);

  const [catEncres, catSolvants, catFilms, catCarton, catMetal, catResines, catConso, catPieces, catPresta, catFournitures] = categories;

  // ═══════════════════ AUDIT RULES ═══════════════════
  await prisma.auditRule.createMany({
    data: [
      { code: 'R01', name: 'Facture sans PO correspondant', category: 'Document', severity: Severity.critical, isActive: true },
      { code: 'R02', name: 'Écart prix > 5% vs contrat', category: 'Prix', severity: Severity.critical, isActive: true },
      { code: 'R03', name: 'Écart quantité > 10% vs PO', category: 'Quantité', severity: Severity.high, isActive: true },
      { code: 'R04', name: 'Fournisseur non évalué depuis 6 mois', category: 'Risque', severity: Severity.medium, isActive: true },
      { code: 'R05', name: 'PO créé après réception marchandise', category: 'Procédure', severity: Severity.critical, isActive: true },
      { code: 'R06', name: 'Paiement avant validation réception', category: 'Procédure', severity: Severity.high, isActive: true },
      { code: 'R07', name: 'Même personne crée et valide le PO', category: 'Procédure', severity: Severity.critical, isActive: true },
      { code: 'R08', name: 'Doublon facture suspecté', category: 'Fraude', severity: Severity.critical, isActive: true },
      { code: 'R09', name: 'Concentration fournisseur > 60%', category: 'Risque', severity: Severity.high, isActive: true },
      { code: 'R10', name: 'Retard livraison > 15 jours', category: 'Qualité', severity: Severity.high, isActive: true },
      { code: 'R11', name: 'Score fournisseur < 40/100', category: 'Risque', severity: Severity.critical, isActive: true },
      { code: 'R12', name: 'Facture sans BL correspondant', category: 'Document', severity: Severity.high, isActive: true },
      { code: 'R13', name: 'Certificat qualité manquant', category: 'Conformité', severity: Severity.medium, isActive: true },
      { code: 'R14', name: 'Paiement anticipé non autorisé', category: 'Conformité', severity: Severity.high, isActive: true },
      { code: 'R15', name: 'Fractionnement suspect de commandes', category: 'Fraude', severity: Severity.critical, isActive: true },
      { code: 'R16', name: 'TVA incorrecte sur facture', category: 'Prix', severity: Severity.medium, isActive: true },
      { code: 'R17', name: 'Conditions paiement non conformes', category: 'Conformité', severity: Severity.medium, isActive: true },
      { code: 'R18', name: 'Chute score fournisseur > 15pts', category: 'Discipline', severity: Severity.high, isActive: true },
      { code: 'R19', name: 'Profil à risque utilisateur', category: 'Discipline', severity: Severity.high, isActive: true },
      { code: 'R20', name: 'Achat hors catalogue référencé', category: 'Procédure', severity: Severity.medium, isActive: true },
    ],
  });

  // ═══════════════════ SUPPLIERS ═══════════════════
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { code: 'SIAM-CHE', name: 'SIAM CHEMICAL Co.', country: 'Thaïlande', city: 'Bangkok', currency: 'THB', categoryId: catEncres.id, status: SupplierStatus.strategic, riskLevel: RiskLevel.medium, scoreGlobal: 82, scoreQuality: 88, scorePrice: 72, scoreDelivery: 80, scoreDoc: 85, scoreReactivity: 78, scoreRegularity: 85, trend: Trend.stable, dependencyRatio: 45, volumeYtd: 285000000, incidentsCount: 3, anomaliesCount: 2, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Somchai Prasert', contactEmail: 's.prasert@siamchem.th', certifications: ['ISO 9001','ISO 14001'], avgLeadTimeDays: 55, x3Id: 'SIAMCHE', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'GZ-PACK', name: 'GUANGZHOU PACKAGING Materials', country: 'Chine', city: 'Guangzhou', currency: 'USD', categoryId: catFilms.id, status: SupplierStatus.active, riskLevel: RiskLevel.high, scoreGlobal: 65, scoreQuality: 70, scorePrice: 85, scoreDelivery: 45, scoreDoc: 60, scoreReactivity: 55, scoreRegularity: 50, trend: Trend.declining, dependencyRatio: 68, volumeYtd: 425000000, incidentsCount: 8, anomaliesCount: 3, incotermDefault: 'FOB', paymentTerms: 'LC 60j', contactName: 'Zhang Wei', contactEmail: 'zhang.w@gzpack.cn', certifications: ['ISO 9001'], avgLeadTimeDays: 75, x3Id: 'GZPACK', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'CHIMAFR', name: 'CHIMIE AFRIQUE SARL', country: 'Cameroun', city: 'Douala', currency: 'XAF', categoryId: catSolvants.id, status: SupplierStatus.active, riskLevel: RiskLevel.medium, scoreGlobal: 71, scoreQuality: 75, scorePrice: 68, scoreDelivery: 78, scoreDoc: 65, scoreReactivity: 82, scoreRegularity: 72, trend: Trend.stable, dependencyRatio: 35, volumeYtd: 89000000, incidentsCount: 4, anomaliesCount: 4, incotermDefault: 'DDP', paymentTerms: '30j net', contactName: 'Paul Ndongo', contactEmail: 'p.ndongo@chimafrique.cm', certifications: ['ISO 9001'], avgLeadTimeDays: 5, x3Id: 'CHIMAFR', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'EURO-INK', name: 'EURO INKS GmbH', country: 'Allemagne', city: 'Stuttgart', currency: 'EUR', categoryId: catEncres.id, status: SupplierStatus.strategic, riskLevel: RiskLevel.low, scoreGlobal: 91, scoreQuality: 95, scorePrice: 78, scoreDelivery: 92, scoreDoc: 95, scoreReactivity: 90, scoreRegularity: 92, trend: Trend.rising, dependencyRatio: 22, volumeYtd: 172000000, incidentsCount: 0, anomaliesCount: 0, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Klaus Müller', contactEmail: 'k.muller@euroinks.de', certifications: ['ISO 9001','ISO 14001','EuPIA','REACH'], avgLeadTimeDays: 35, x3Id: 'EUROINK', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'TATA-TP', name: 'TATA TINPLATE Company', country: 'Inde', city: 'Jamshedpur', currency: 'USD', categoryId: catMetal.id, status: SupplierStatus.active, riskLevel: RiskLevel.medium, scoreGlobal: 74, scoreQuality: 82, scorePrice: 75, scoreDelivery: 68, scoreDoc: 70, scoreReactivity: 65, scoreRegularity: 72, trend: Trend.stable, dependencyRatio: 55, volumeYtd: 320000000, incidentsCount: 2, anomaliesCount: 1, incotermDefault: 'CIF', paymentTerms: '90j net', contactName: 'Rajesh Sharma', contactEmail: 'r.sharma@tatatinplate.in', certifications: ['ISO 9001','ISO 14001','BIS'], avgLeadTimeDays: 60, x3Id: 'TATATP', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'SAPPI', name: 'SAPPI TRADING', country: 'Afrique du Sud', city: 'Johannesburg', currency: 'USD', categoryId: catCarton.id, status: SupplierStatus.active, riskLevel: RiskLevel.low, scoreGlobal: 85, scoreQuality: 88, scorePrice: 80, scoreDelivery: 85, scoreDoc: 88, scoreReactivity: 82, scoreRegularity: 85, trend: Trend.stable, dependencyRatio: 40, volumeYtd: 380000000, incidentsCount: 1, anomaliesCount: 1, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Jan Van Der Merwe', contactEmail: 'j.vandermerwe@sappi.com', certifications: ['ISO 9001','FSC','PEFC'], avgLeadTimeDays: 45, x3Id: 'SAPPI', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'MEGAPLA', name: 'MEGAPLAST Industries', country: 'Nigeria', city: 'Lagos', currency: 'XAF', categoryId: catResines.id, status: SupplierStatus.probation, riskLevel: RiskLevel.critical, scoreGlobal: 38, scoreQuality: 35, scorePrice: 55, scoreDelivery: 30, scoreDoc: 28, scoreReactivity: 40, scoreRegularity: 32, trend: Trend.declining, dependencyRatio: 18, volumeYtd: 78000000, incidentsCount: 18, anomaliesCount: 5, incotermDefault: 'FOB', paymentTerms: '30j net', contactName: 'Chukwuemeka Obi', contactEmail: 'c.obi@megaplast.ng', certifications: [], avgLeadTimeDays: 25, x3Id: 'MEGAPLA', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'SICPA', name: 'SICPA SA', country: 'Suisse', city: 'Lausanne', currency: 'EUR', categoryId: catEncres.id, status: SupplierStatus.backup, riskLevel: RiskLevel.low, scoreGlobal: 88, scoreQuality: 95, scorePrice: 65, scoreDelivery: 90, scoreDoc: 92, scoreReactivity: 88, scoreRegularity: 90, trend: Trend.stable, dependencyRatio: 8, volumeYtd: 45000000, incidentsCount: 0, anomaliesCount: 0, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Pierre Duval', contactEmail: 'p.duval@sicpa.ch', certifications: ['ISO 9001','ISO 14001','EuPIA'], avgLeadTimeDays: 30, x3Id: 'SICPA', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'LOGSERV', name: 'LOGISTIQUE SERVICES', country: 'Cameroun', city: 'Douala', currency: 'XAF', categoryId: catPresta.id, status: SupplierStatus.active, riskLevel: RiskLevel.low, scoreGlobal: 78, scoreQuality: 80, scorePrice: 72, scoreDelivery: 85, scoreDoc: 75, scoreReactivity: 90, scoreRegularity: 78, trend: Trend.stable, dependencyRatio: 30, volumeYtd: 32000000, incidentsCount: 1, anomaliesCount: 0, incotermDefault: 'DDP', paymentTerms: 'Comptant', contactName: 'Jean Mebara', contactEmail: 'j.mebara@logserv.cm', certifications: [], avgLeadTimeDays: 1, x3Id: 'LOGSERV', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'VINPLA', name: 'VINPLAST Ltd', country: 'Inde', city: 'Mumbai', currency: 'USD', categoryId: catMetal.id, status: SupplierStatus.active, riskLevel: RiskLevel.medium, scoreGlobal: 72, scoreQuality: 76, scorePrice: 82, scoreDelivery: 65, scoreDoc: 70, scoreReactivity: 60, scoreRegularity: 68, trend: Trend.stable, dependencyRatio: 25, volumeYtd: 145000000, incidentsCount: 3, anomaliesCount: 0, incotermDefault: 'CIF', paymentTerms: '90j net', contactName: 'Amit Patel', contactEmail: 'a.patel@vinplast.in', certifications: ['ISO 9001','BIS'], avgLeadTimeDays: 50, x3Id: 'VINPLA', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'POLYFX', name: 'POLYFLEX PACKAGING', country: 'Corée du Sud', city: 'Séoul', currency: 'USD', categoryId: catFilms.id, status: SupplierStatus.active, riskLevel: RiskLevel.low, scoreGlobal: 80, scoreQuality: 85, scorePrice: 72, scoreDelivery: 82, scoreDoc: 80, scoreReactivity: 75, scoreRegularity: 82, trend: Trend.rising, dependencyRatio: 15, volumeYtd: 198000000, incidentsCount: 1, anomaliesCount: 0, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Kim Soo-jin', contactEmail: 'sj.kim@polyflex.kr', certifications: ['ISO 9001','ISO 14001'], avgLeadTimeDays: 40, x3Id: 'POLYFX', x3SyncStatus: X3SyncStatus.synced } }),
    prisma.supplier.create({ data: { code: 'SABIC', name: 'SABIC', country: 'Arabie Saoudite', city: 'Riyadh', currency: 'USD', categoryId: catResines.id, status: SupplierStatus.active, riskLevel: RiskLevel.low, scoreGlobal: 86, scoreQuality: 90, scorePrice: 78, scoreDelivery: 85, scoreDoc: 88, scoreReactivity: 80, scoreRegularity: 88, trend: Trend.stable, dependencyRatio: 12, volumeYtd: 95000000, incidentsCount: 0, anomaliesCount: 0, incotermDefault: 'CIF', paymentTerms: '60j net', contactName: 'Ahmed Al-Rashid', contactEmail: 'a.rashid@sabic.com', certifications: ['ISO 9001','ISO 14001','RC 14001'], avgLeadTimeDays: 38, x3Id: 'SABIC', x3SyncStatus: X3SyncStatus.synced } }),
  ]);

  const [siamChem, gzPack, chimAfr, euroInk, tataTp, sappi, megaplast, sicpa, logServ, vinplast, polyflex, sabic] = suppliers;

  // ═══════════════════ ARTICLES ═══════════════════
  await prisma.article.createMany({
    data: [
      { code: 'BOPP-20T', designation: 'Film BOPP 20μ transparent', familyId: 'cat03', unit: 'kg', poleIds: ['HF'], supplierIds: [gzPack.id, polyflex.id], criticalLevel: CriticalLevel.vital, safetyStockDays: 15, avgMonthlyConsumption: 24000, currentStock: 4800, x3Id: 'BOPP20T' },
      { code: 'BOPP-25B', designation: 'Film BOPP 25μ blanc', familyId: 'cat03', unit: 'kg', poleIds: ['HF'], supplierIds: [gzPack.id], criticalLevel: CriticalLevel.critical, safetyStockDays: 15, avgMonthlyConsumption: 12000, currentStock: 3200, x3Id: 'BOPP25B' },
      { code: 'EH-BL12', designation: 'Encre hélio bleue réf. SH-B12', familyId: 'cat01', unit: 'kg', poleIds: ['HF'], supplierIds: [siamChem.id], criticalLevel: CriticalLevel.vital, safetyStockDays: 20, avgMonthlyConsumption: 2400, currentStock: 1200, x3Id: 'EHBL12' },
      { code: 'EO-CYAN', designation: 'Encre offset process cyan', familyId: 'cat01', unit: 'kg', poleIds: ['OE','OC'], supplierIds: [euroInk.id], criticalLevel: CriticalLevel.critical, safetyStockDays: 20, avgMonthlyConsumption: 800, currentStock: 650, x3Id: 'EOCYAN' },
      { code: 'FB-022', designation: 'Fer blanc ETP 0.22mm', familyId: 'cat05', unit: 'kg', poleIds: ['BC'], supplierIds: [tataTp.id], criticalLevel: CriticalLevel.vital, safetyStockDays: 20, avgMonthlyConsumption: 18000, currentStock: 18000, x3Id: 'FB022' },
      { code: 'CC-GC1', designation: 'Carton compact GC1 300g', familyId: 'cat04', unit: 'kg', poleIds: ['OC'], supplierIds: [sappi.id], criticalLevel: CriticalLevel.vital, safetyStockDays: 15, avgMonthlyConsumption: 36000, currentStock: 25000, x3Id: 'CCGC1' },
      { code: 'RE-PEHD', designation: 'Résine PE HD granulés', familyId: 'cat06', unit: 'kg', poleIds: ['HF'], supplierIds: [megaplast.id, sabic.id], criticalLevel: CriticalLevel.critical, safetyStockDays: 15, avgMonthlyConsumption: 9000, currentStock: 3500, x3Id: 'REPEHD' },
      { code: 'SV-AE', designation: 'Solvant acétate éthyle', familyId: 'cat02', unit: 'kg', poleIds: ['HF'], supplierIds: [chimAfr.id], criticalLevel: CriticalLevel.important, safetyStockDays: 10, avgMonthlyConsumption: 4500, currentStock: 3000, x3Id: 'SVAE' },
    ],
  });

  // ═══════════════════ ORDERS (5 key orders) ═══════════════════
  const orders = await Promise.all([
    prisma.order.create({ data: { poNumber: 'PO-2025-0412', supplierId: gzPack.id, poleId: 'HF', dateCreated: new Date('2026-03-01'), dateExpected: new Date('2026-03-20'), totalAmount: 42500000, currency: 'USD', status: OrderStatus.in_transit, isLate: true, delayDays: 11, riskOfStockout: true, x3Id: 'PO0412' } }),
    prisma.order.create({ data: { poNumber: 'PO-2025-0413', supplierId: euroInk.id, poleId: 'OE', dateCreated: new Date('2026-02-15'), dateExpected: new Date('2026-03-25'), totalAmount: 28750000, currency: 'EUR', status: OrderStatus.received, isLate: false, delayDays: 0, x3Id: 'PO0413' } }),
    prisma.order.create({ data: { poNumber: 'PO-2025-0430', supplierId: megaplast.id, poleId: 'HF', dateCreated: new Date('2026-02-10'), dateExpected: new Date('2026-03-08'), totalAmount: 15600000, currency: 'XAF', status: OrderStatus.confirmed, isLate: true, delayDays: 23, riskOfStockout: true, x3Id: 'PO0430' } }),
    prisma.order.create({ data: { poNumber: 'PO-2025-0445', supplierId: sappi.id, poleId: 'OC', dateCreated: new Date('2026-03-05'), dateExpected: new Date('2026-04-15'), totalAmount: 55016000, currency: 'USD', status: OrderStatus.confirmed, isLate: false, delayDays: 0, x3Id: 'PO0445' } }),
    prisma.order.create({ data: { poNumber: 'PO-2025-0460', supplierId: chimAfr.id, poleId: 'OC', dateCreated: new Date('2026-03-10'), dateExpected: new Date('2026-03-18'), totalAmount: 6800000, currency: 'XAF', status: OrderStatus.in_transit, isLate: true, delayDays: 13, x3Id: 'PO0460' } }),
  ]);

  // ═══════════════════ ORDER LINES ═══════════════════
  await prisma.orderLine.createMany({
    data: [
      // PO-0412 GUANGZHOU — Films BOPP
      { orderId: orders[0].id, description: 'Film BOPP 20μ transparent', quantity: 10000, unitPrice: 3200, totalPrice: 32000000, unit: 'kg' },
      { orderId: orders[0].id, description: 'Film BOPP 25μ blanc', quantity: 4000, unitPrice: 2625, totalPrice: 10500000, unit: 'kg' },
      // PO-0413 EURO INKS — Encres offset
      { orderId: orders[1].id, description: 'Encre offset process cyan', quantity: 500, unitPrice: 18500, totalPrice: 9250000, unit: 'kg' },
      { orderId: orders[1].id, description: 'Encre offset process magenta', quantity: 500, unitPrice: 19000, totalPrice: 9500000, unit: 'kg' },
      { orderId: orders[1].id, description: 'Encre offset process noir', quantity: 400, unitPrice: 25000, totalPrice: 10000000, unit: 'kg' },
      // PO-0430 MEGAPLAST — Résine
      { orderId: orders[2].id, description: 'Résine PE HD granulés', quantity: 8000, unitPrice: 1950, totalPrice: 15600000, unit: 'kg' },
      // PO-0445 SAPPI — Carton
      { orderId: orders[3].id, description: 'Carton compact GC1 300g', quantity: 40000, unitPrice: 1375, totalPrice: 55016000, unit: 'kg' },
      // PO-0460 CHIMIE AFRIQUE — Solvants
      { orderId: orders[4].id, description: 'Solvant acétate éthyle', quantity: 3000, unitPrice: 1800, totalPrice: 5400000, unit: 'kg' },
      { orderId: orders[4].id, description: 'Colle PU bi-composant', quantity: 500, unitPrice: 2800, totalPrice: 1400000, unit: 'kg' },
    ],
  });

  // ═══════════════════ ANOMALIES (10 key anomalies) ═══════════════════
  await prisma.anomaly.createMany({
    data: [
      { category: 'Prix', subCategory: 'Écart facture vs contrat', severity: Severity.critical, priority: 1, title: 'Écart prix +12.3% sur encres hélio', description: 'Facture FAC-2025-0847: prix 5 230 FCFA/kg vs contrat 4 658 FCFA/kg.', detectionMethod: 'auto_rule', ruleId: 'R02', supplierId: siamChem.id, userId: comptable.id, poleId: 'HF', orderId: orders[0].id, financialImpact: 2860000, dateDetected: new Date('2026-03-25'), status: AnomalyStatus.open },
      { category: 'Fraude', subCategory: 'Doublon facture', severity: Severity.critical, priority: 1, title: 'Doublon suspecté FAC-0847 / FAC-0849', description: 'Montants quasi identiques (écart 0.3%) dans un intervalle de 5 jours.', detectionMethod: 'auto_rule', ruleId: 'R08', supplierId: siamChem.id, userId: comptable.id, poleId: 'HF', financialImpact: 35400000, dateDetected: new Date('2026-03-26'), status: AnomalyStatus.investigating },
      { category: 'Procédure', subCategory: 'PO après réception', severity: Severity.critical, priority: 1, title: 'Commande créée après livraison — CHIMIE AFRIQUE', description: 'PO-2025-0460 créé après livraison. Bon de commande rétrodaté.', detectionMethod: 'auto_rule', ruleId: 'R05', supplierId: chimAfr.id, userId: acheteur.id, poleId: 'OC', orderId: orders[4].id, financialImpact: 6800000, dateDetected: new Date('2026-03-20'), status: AnomalyStatus.open },
      { category: 'Fraude', subCategory: 'Fractionnement', severity: Severity.critical, priority: 1, title: 'Fractionnement détecté — CHIMIE AFRIQUE', description: '4 commandes consécutives sous le seuil de validation (4.9M chacune vs seuil 5M).', detectionMethod: 'auto_rule', ruleId: 'R15', supplierId: chimAfr.id, userId: acheteur.id, poleId: 'OC', financialImpact: 19600000, dateDetected: new Date('2026-03-22'), status: AnomalyStatus.open },
      { category: 'Quantité', subCategory: 'Écart réception', severity: Severity.high, priority: 2, title: 'Écart quantité -8% réception films BOPP', description: '9 200 kg reçus vs 10 000 kg commandés.', detectionMethod: 'auto_rule', ruleId: 'R03', supplierId: gzPack.id, userId: magasinier.id, poleId: 'HF', orderId: orders[0].id, financialImpact: 3400000, dateDetected: new Date('2026-03-22'), status: AnomalyStatus.open },
      { category: 'Document', subCategory: 'BL manquant', severity: Severity.high, priority: 2, title: 'Facture MEGAPLAST sans BL correspondant', description: 'Facture MEGA-INV-0308 reçue sans bon de livraison.', detectionMethod: 'auto_rule', ruleId: 'R12', supplierId: megaplast.id, userId: comptable.id, poleId: 'HF', financialImpact: 15600000, dateDetected: new Date('2026-03-18'), status: AnomalyStatus.open },
      { category: 'Qualité', subCategory: 'Non-conformité', severity: Severity.high, priority: 2, title: 'Film BOPP non conforme — opacité insuffisante', description: 'Lot 2503-GZ-4821: test opacité 78% vs spécification 85% minimum.', detectionMethod: 'manual', supplierId: gzPack.id, userId: magasinier.id, poleId: 'HF', financialImpact: 8500000, dateDetected: new Date('2026-03-24'), status: AnomalyStatus.open },
      { category: 'Conformité', subCategory: 'Paiement non autorisé', severity: Severity.high, priority: 2, title: 'Paiement anticipé non autorisé — GUANGZHOU', description: 'Paiement 42.5M avant validation réception.', detectionMethod: 'auto_rule', ruleId: 'R14', supplierId: gzPack.id, userId: comptable.id, poleId: 'HF', financialImpact: 42500000, dateDetected: new Date('2026-03-10'), status: AnomalyStatus.open },
      { category: 'Prix', subCategory: 'Écart facture', severity: Severity.high, priority: 2, title: 'Écart prix +5.8% sur carton compact SAPPI', description: 'Facture à 1 375 FCFA/kg vs contrat 1 300 FCFA/kg.', detectionMethod: 'auto_rule', ruleId: 'R02', supplierId: sappi.id, userId: comptable.id, poleId: 'OC', financialImpact: 3016000, dateDetected: new Date('2026-03-28'), status: AnomalyStatus.open },
      { category: 'Risque', subCategory: 'Score critique', severity: Severity.high, priority: 2, title: 'Score fournisseur critique — MEGAPLAST 38/100', description: 'Score passé sous le seuil de 40/100.', detectionMethod: 'auto_rule', ruleId: 'R11', supplierId: megaplast.id, poleId: 'HF', dateDetected: new Date('2026-03-28'), status: AnomalyStatus.open },
    ],
  });

  // ═══════════════════ DOCUMENTS / OCR ═══════════════════
  await prisma.document.createMany({
    data: [
      { fileName: 'FAC-2025-0847-SIAM.pdf', fileSize: '1.2 MB', fileType: 'invoice', uploadedById: comptable.id, assignedToId: comptable.id, supplierId: siamChem.id, invoiceNumber: 'FAC-2025-0847', amountHt: 33450000, amountTva: 6440000, amountTtc: 39890000, ocrStatus: 'extracted' as any, ocrConfidence: 0.94, pipelineStage: 4, reconciliationStatus: 'ecart_majeur' as any, variances: [{ field: 'prix', diff_pct: 12.3 }] },
      { fileName: 'FAC-2025-0849-SIAM.pdf', fileSize: '1.1 MB', fileType: 'invoice', uploadedById: comptable.id, assignedToId: comptable.id, supplierId: siamChem.id, invoiceNumber: 'FAC-2025-0849', amountHt: 33560000, amountTva: 6461000, amountTtc: 40021000, ocrStatus: 'extracted' as any, ocrConfidence: 0.92, pipelineStage: 5, reconciliationStatus: 'critical' as any, variances: [{ field: 'doublon', diff_pct: 0.3 }] },
      { fileName: 'INV-GZ-2025-0318.pdf', fileSize: '890 KB', fileType: 'invoice', uploadedById: comptable.id, assignedToId: acheteur.id, supplierId: gzPack.id, invoiceNumber: 'INV-GZ-2025-0318', amountHt: 42500000, amountTtc: 42500000, ocrStatus: 'extracted' as any, ocrConfidence: 0.88, pipelineStage: 5, reconciliationStatus: 'ecart_mineur' as any, variances: [{ field: 'paiement', diff_pct: 0 }] },
      { fileName: 'BL-2503-412-GUANGZHOU.pdf', fileSize: '540 KB', fileType: 'bl', uploadedById: magasinier.id, assignedToId: magasinier.id, supplierId: gzPack.id, poNumber: 'PO-2025-0412', ocrStatus: 'extracted' as any, ocrConfidence: 0.91, pipelineStage: 6, reconciliationStatus: 'conforme' as any },
      { fileName: 'CERT-ISO-EUROINKS-2026.pdf', fileSize: '320 KB', fileType: 'certificate', uploadedById: acheteur.id, supplierId: euroInk.id, ocrStatus: 'extracted' as any, ocrConfidence: 0.96, pipelineStage: 7, reconciliationStatus: 'validated' as any },
      { fileName: 'MEGA-INV-0308.pdf', fileSize: '780 KB', fileType: 'invoice', uploadedById: comptable.id, assignedToId: comptable.id, supplierId: megaplast.id, invoiceNumber: 'MEGA-INV-0308', amountHt: 15600000, amountTva: 3003000, amountTtc: 18603000, ocrStatus: 'extracted' as any, ocrConfidence: 0.85, pipelineStage: 4, reconciliationStatus: 'critical' as any, variances: [{ field: 'bl_absent', diff_pct: 0 }] },
      { fileName: 'SAPPI-INV-0328.pdf', fileSize: '950 KB', fileType: 'invoice', uploadedById: comptable.id, assignedToId: comptable.id, supplierId: sappi.id, invoiceNumber: 'SAPPI-INV-0328', amountHt: 55016000, amountTva: 10590000, amountTtc: 65606000, ocrStatus: 'extracted' as any, ocrConfidence: 0.93, pipelineStage: 5, reconciliationStatus: 'ecart_majeur' as any, variances: [{ field: 'prix', diff_pct: 5.8 }] },
    ],
  });

  // ═══════════════════ RAW MATERIALS ═══════════════════
  await prisma.rawMaterial.createMany({
    data: [
      { name: 'Film BOPP 20μ', category: 'Films', unit: '$/t', currency: 'USD', currentPrice: 2450, previousPrice: 2374, variationPct: 3.2, trend: Trend.rising, impactedPoles: ['HF'], alertType: AlertType.risk },
      { name: 'Résine PE HD', category: 'Résines', unit: '$/t', currency: 'USD', currentPrice: 1180, previousPrice: 1243, variationPct: -5.1, trend: Trend.declining, impactedPoles: ['HF','BC'], alertType: AlertType.opportunity },
      { name: 'Fer blanc 0.22mm', category: 'Métal', unit: '$/t', currency: 'USD', currentPrice: 1890, previousPrice: 1871, variationPct: 1.0, trend: Trend.stable, impactedPoles: ['BC'], alertType: AlertType.neutral },
      { name: 'Encre hélio base solvant', category: 'Encres', unit: '€/t', currency: 'EUR', currentPrice: 4200, previousPrice: 4299, variationPct: -2.3, trend: Trend.declining, impactedPoles: ['HF'], alertType: AlertType.opportunity },
      { name: 'Carton GC1 300g', category: 'Carton', unit: '$/t', currency: 'USD', currentPrice: 850, previousPrice: 835, variationPct: 1.8, trend: Trend.rising, impactedPoles: ['OC'], alertType: AlertType.risk },
      { name: 'Solvant acétate éthyle', category: 'Solvants', unit: '€/t', currency: 'EUR', currentPrice: 1050, previousPrice: 1050, variationPct: 0, trend: Trend.stable, impactedPoles: ['HF'], alertType: AlertType.neutral },
    ],
  });

  // ═══════════════════ ALTERNATIVE SUPPLIERS ═══════════════════
  await prisma.alternativeSupplier.createMany({
    data: [
      { categoryId: catSolvants.id, name: 'HENKEL ADHESIVES', country: 'Allemagne', city: 'Düsseldorf', currency: 'EUR', contactName: 'Hans Weber', contactEmail: 'h.weber@henkel.de', status: AltSupplierStatus.qualified, evaluation: { price: 65, quality: 95, lead_time: 28, moq: '500 kg', certifications: ['ISO 9001','ISO 14001','REACH'], risk_level: 'low' }, relevanceScore: 88, comparisonNotes: 'Colles PU premium. Prix élevé mais qualité supérieure.' },
      { categoryId: catEncres.id, name: 'SIEGWERK DRUCKFARBEN', country: 'Allemagne', city: 'Siegburg', currency: 'EUR', contactName: 'Stefan Braun', contactEmail: 's.braun@siegwerk.com', status: AltSupplierStatus.in_test, evaluation: { price: 68, quality: 92, lead_time: 38, moq: '1 000 kg', certifications: ['ISO 9001','ISO 14001','EuPIA'], risk_level: 'low' }, relevanceScore: 85, comparisonNotes: 'Encres hélio et offset. Test en cours sur pôle HF.' },
      { categoryId: catFilms.id, name: 'COSMO FILMS', country: 'Inde', city: 'New Delhi', currency: 'USD', contactName: 'Vikram Singh', contactEmail: 'v.singh@cosmofilms.com', status: AltSupplierStatus.qualified, evaluation: { price: 82, quality: 78, lead_time: 55, moq: '5 000 kg', certifications: ['ISO 9001','BRC'], risk_level: 'medium' }, relevanceScore: 76, comparisonNotes: 'Films BOPP compétitifs. -8% vs GUANGZHOU.' },
      { categoryId: catResines.id, name: 'SABIC (alt)', country: 'Arabie Saoudite', city: 'Riyadh', currency: 'USD', contactName: 'Omar Hassan', contactEmail: 'o.hassan@sabic.com', status: AltSupplierStatus.qualified, evaluation: { price: 75, quality: 90, lead_time: 38, moq: '1 000 kg', certifications: ['ISO 9001','RC 14001'], risk_level: 'low' }, relevanceScore: 82, comparisonNotes: 'Alternative solide à MEGAPLAST. TCO -23%.' },
      { categoryId: catEncres.id, name: 'TOYO INK', country: 'Japon', city: 'Tokyo', currency: 'JPY', contactName: 'Tanaka Yoshi', contactEmail: 'y.tanaka@toyoink.jp', status: AltSupplierStatus.in_discussion, evaluation: { price: 58, quality: 95, lead_time: 50, moq: '2 000 kg', certifications: ['ISO 9001','ISO 14001'], risk_level: 'low' }, relevanceScore: 72, comparisonNotes: 'Premium. Prix très élevé mais qualité top.' },
      { categoryId: catFilms.id, name: 'JINDAL POLY FILMS', country: 'Inde', city: 'Mumbai', currency: 'USD', contactName: 'Rahul Gupta', contactEmail: 'r.gupta@jindalfilms.in', status: AltSupplierStatus.identified, evaluation: { price: 85, quality: 72, lead_time: 60, moq: '10 000 kg', certifications: ['ISO 9001'], risk_level: 'medium' }, relevanceScore: 68 },
    ],
  });

  // ═══════════════════ NEGOTIATIONS ═══════════════════
  await prisma.negotiation.createMany({
    data: [
      { supplierId: gzPack.id, subject: 'Contrat cadre films BOPP/PET 2026', category: 'Films', dateStart: new Date('2026-01-10'), dateDeadline: new Date('2026-04-30'), financialStake: 65000000, targetSavings: 8500000, status: NegotiationStatus.pending_decision, strategy: 'Mise en concurrence COSMO FILMS + POLYFLEX', rounds: [
        { date: '2026-01-10', type: 'Ouverture', summary: 'Demande de remise volume sur engagement annuel 150t BOPP + 30t PET.', outcome: 'GUANGZHOU propose -3%.' },
        { date: '2026-02-12', type: 'Benchmark', summary: 'Présentation offres COSMO FILMS (-8%) et POLYFLEX (-5%).', outcome: 'GUANGZHOU revoit à -6%.' },
        { date: '2026-03-15', type: 'Dernière offre', summary: 'GUANGZHOU propose -7% + amélioration délai de 75j à 65j. COSMO à -8% mais délai 55j.', outcome: 'Décision à prendre.' },
      ] },
      { supplierId: siamChem.id, subject: 'Renégociation contrat encres hélio 2026', category: 'Encres', dateStart: new Date('2026-02-01'), dateDeadline: new Date('2026-04-30'), financialStake: 42000000, targetSavings: 5000000, status: NegotiationStatus.in_progress, strategy: 'Pression prix suite écart +12.3% détecté', rounds: [
        { date: '2026-02-01', type: 'Ouverture', summary: 'Contestation écart prix constaté. Demande retour au prix contractuel.', outcome: 'SIAM reconnaît l\'erreur.' },
        { date: '2026-03-10', type: 'Contre-proposition', summary: 'SIAM propose prix -2% vs ancien contrat + livraison incluse.', outcome: 'Insuffisant. Demande -5%.' },
      ] },
      { supplierId: megaplast.id, subject: 'Remplacement MEGAPLAST — Résine PE HD', category: 'Résines', dateStart: new Date('2026-03-01'), financialStake: 28000000, targetSavings: 14000000, status: NegotiationStatus.preparation, strategy: 'Transfert volume vers SABIC suite score critique 38/100' },
    ],
  });

  // ═══════════════════ QUOTE COMPARISONS ═══════════════════
  const qc1 = await prisma.quoteComparison.create({ data: { subject: 'Film BOPP 20μ transparent — Appel d\'offres Q2 2026', createdById: dirAchat.id, status: 'active' } });
  await prisma.quoteLine.createMany({
    data: [
      { comparisonId: qc1.id, supplierId: gzPack.id, supplierName: 'GUANGZHOU PACKAGING', unitPrice: 3200, landedCost: 3450, freightCost: 250, moq: '10 000 kg', leadTime: 75, incoterm: 'FOB', paymentTerms: 'LC 60j', certifications: ['ISO 9001'], tco: 3450, score: 65, reco: 'Prix compétitif mais délais longs' },
      { comparisonId: qc1.id, supplierName: 'COSMO FILMS', unitPrice: 2950, landedCost: 3280, freightCost: 330, moq: '5 000 kg', leadTime: 55, incoterm: 'CIF', paymentTerms: '60j net', certifications: ['ISO 9001','BRC'], tco: 3280, score: 76, reco: 'Meilleur TCO, certifié BRC' },
      { comparisonId: qc1.id, supplierId: polyflex.id, supplierName: 'POLYFLEX PACKAGING', unitPrice: 3400, landedCost: 3600, freightCost: 200, moq: '8 000 kg', leadTime: 40, incoterm: 'CIF', paymentTerms: '60j net', certifications: ['ISO 9001','ISO 14001'], tco: 3600, score: 80, reco: 'Meilleur délai, qualité supérieure' },
    ],
  });

  const qc2 = await prisma.quoteComparison.create({ data: { subject: 'Résine PE HD — Remplacement MEGAPLAST', createdById: dirAchat.id, status: 'active' } });
  await prisma.quoteLine.createMany({
    data: [
      { comparisonId: qc2.id, supplierId: megaplast.id, supplierName: 'MEGAPLAST Industries', unitPrice: 1950, landedCost: 2100, freightCost: 150, moq: '5 000 kg', leadTime: 25, incoterm: 'FOB', paymentTerms: '30j net', certifications: [], tco: 2100, score: 38, reco: 'Score critique — À remplacer' },
      { comparisonId: qc2.id, supplierId: sabic.id, supplierName: 'SABIC', unitPrice: 2050, landedCost: 2280, freightCost: 230, moq: '1 000 kg', leadTime: 38, incoterm: 'CIF', paymentTerms: '60j net', certifications: ['ISO 9001','RC 14001'], tco: 2280, score: 86, reco: 'TCO +9% mais fiabilité nettement supérieure' },
    ],
  });

  // ═══════════════════ LETTERS ═══════════════════
  await prisma.letter.createMany({
    data: [
      { type: 'price_dispute' as any, supplierId: siamChem.id, subject: 'Contestation écart prix +12.3% — Encres hélio', tone: 'firm', status: 'ready' as any, generatedBy: 'ia', body: 'MULTIPRINT S.A.\nZone Industrielle de Bonabéri\nDouala, le 28 mars 2026\n\nÀ l\'attention de la Direction\nSIAM CHEMICAL Co.\n\nObjet : Contestation écart de prix — Facture FAC-2025-0847\n\nMadame, Monsieur,\n\nNous avons constaté un écart significatif de +12.3% entre le prix facturé (5 230 FCFA/kg) et le prix contractuel (4 658 FCFA/kg) sur la facture FAC-2025-0847 relative à nos encres hélio.\n\nL\'impact financier de cet écart est estimé à 2 860 000 FCFA.\n\nNous vous demandons de procéder à la régularisation dans les 15 jours.\n\nCordialement,\nDirection des Achats\nMULTIPRINT S.A.', createdById: dirAchat.id },
      { type: 'delivery_reminder' as any, supplierId: gzPack.id, subject: 'Relance livraison PO-2025-0412 — Films BOPP', tone: 'urgent', status: 'sent' as any, generatedBy: 'ia', body: 'MULTIPRINT S.A.\nDouala, le 25 mars 2026\n\nÀ l\'attention de GUANGZHOU PACKAGING Materials\n\nObjet : Relance urgente — Commande PO-2025-0412\n\nMadame, Monsieur,\n\nLa commande PO-2025-0412 accusée un retard de +11 jours. Ce retard met en danger notre production du pôle Héliogravure Flexible (risque de rupture Film BOPP).\n\nNous vous demandons un calendrier de livraison ferme sous 48h.\n\nCordialement,\nDirection des Achats', createdById: acheteur.id },
      { type: 'certificate_request' as any, supplierId: megaplast.id, subject: 'Demande certificats qualité — MEGAPLAST', tone: 'formal', status: 'draft' as any, generatedBy: 'manual', body: 'MULTIPRINT S.A.\nDouala, le 30 mars 2026\n\nÀ l\'attention de MEGAPLAST Industries\n\nObjet : Demande de certificats qualité\n\nMadame, Monsieur,\n\nDans le cadre de notre audit qualité, merci de nous transmettre vos certificats ISO et fiches de données de sécurité.\n\nCordialement,\nDirection des Achats', createdById: acheteur.id },
      { type: 'rfq' as any, subject: 'Appel d\'offres Films BOPP 20μ — Q2 2026', tone: 'formal', status: 'draft' as any, generatedBy: 'ia', body: 'MULTIPRINT S.A.\nDouala, le 1er avril 2026\n\nObjet : Appel d\'offres — Films BOPP 20μ transparent\n\nMadame, Monsieur,\n\nDans le cadre de notre processus d\'approvisionnement, nous sollicitons votre meilleure offre pour 150 tonnes de Film BOPP 20μ transparent pour l\'année 2026.\n\nDate limite: 30 avril 2026.\n\nCordialement,\nDirection des Achats', createdById: dirAchat.id },
    ],
  });

  // ═══════════════════ NOTIFICATIONS ═══════════════════
  await prisma.notification.createMany({
    data: [
      { title: 'Anomalie critique détectée', message: 'Écart prix +12.3% sur encres hélio SIAM CHEMICAL. Impact: 2 860 000 FCFA.', severity: Severity.critical, relatedEntityType: 'anomaly' },
      { title: 'Doublon facture suspecté', message: 'FAC-0847 et FAC-0849 de SIAM CHEMICAL présentent un écart de 0.3% en 5 jours.', severity: Severity.critical, relatedEntityType: 'anomaly' },
      { title: 'Commande en retard critique', message: 'PO-2025-0412 GUANGZHOU PACKAGING: retard +11 jours, risque de rupture Film BOPP.', severity: Severity.critical, relatedEntityType: 'order' },
      { title: 'Score fournisseur critique', message: 'MEGAPLAST Industries: score tombé à 38/100. Mise en probation recommandée.', severity: Severity.high, relatedEntityType: 'supplier' },
      { title: 'Opportunité marché', message: 'Résine PE HD en baisse de -5.1%. Fenêtre d\'achat anticipé recommandée.', severity: Severity.info, relatedEntityType: 'rawMaterial' },
    ],
  });

  // ═══════════════════ ACTIVITY LOG ═══════════════════
  await prisma.activityLog.createMany({
    data: [
      { userId: dirAchat.id, userName: 'Daniel Moukoko', action: 'login', module: 'auth', details: 'Connexion utilisateur' },
      { userId: acheteur.id, userName: 'Alice Ngo Bassa', action: 'create', module: 'orders', details: 'Création commande PO-2025-0475' },
      { userId: comptable.id, userName: 'Christian Fotso', action: 'create', module: 'documents', details: 'Upload document SAPPI-INV-2025-0328.pdf' },
      { userId: dirAchat.id, userName: 'Daniel Moukoko', action: 'ai_query', module: 'ai', details: 'Question ProcureBot: Quels sont les risques de rupture ?', aiInvolved: true },
      { userId: dirAchat.id, userName: 'Daniel Moukoko', action: 'create', module: 'letters', details: 'Génération courrier contestation SIAM CHEMICAL via IA', aiInvolved: true },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`   ${users.length} users`);
  console.log(`   ${categories.length} categories`);
  console.log(`   ${suppliers.length} suppliers`);
  console.log(`   ${orders.length} orders`);
  console.log('   8 articles, 20 audit rules, 10 anomalies');
  console.log('   6 raw materials, 6 alt suppliers, 3 negotiations');
  console.log('   5 notifications, 5 activity logs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
