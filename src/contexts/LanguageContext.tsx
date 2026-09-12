import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type LanguageCode = 
  | 'en' 
  | 'es' 
  | 'fr' 
  | 'de' 
  | 'ja' 
  | 'zh' 
  | 'ko' 
  | 'pt' 
  | 'it' 
  | 'nl' 
  | 'hi' 
  | 'ar' 
  | 'ru' 
  | 'sv'
  | 'tr'
  | 'pl'
  | 'id';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag?: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English (US)', nativeLabel: 'English (US)' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'pt', label: 'Portuguese (BR)', nativeLabel: 'Português (Brasil)' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'sv', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    'nav.product': 'Product',
    'nav.solutions': 'Solutions',
    'nav.resources': 'Resources',
    'nav.developers': 'Developers',
    'nav.pricing': 'Pricing',
    'nav.enterprise': 'Enterprise',
    'nav.docs': 'Docs',
    'nav.download': 'Download',
    'nav.whatsNew': "What's New",
    'nav.signIn': 'Sign In',
    'nav.getStarted': 'Get Started Free',
    'nav.openApp': 'Open App',

    'footer.product': 'Product',
    'footer.solutions': 'Solutions',
    'footer.resources': 'Resources',
    'footer.helpSupport': 'Help & Support',
    'footer.company': 'Company',
    'footer.developers': 'Developers',

    'footer.noskaAI': 'Noska AI & Docs',
    'footer.noskaFlow': 'Noska Flow',
    'footer.desktopApp': 'Desktop app',
    'footer.whatsNew': "What's new",

    'footer.personalUse': 'Personal use',
    'footer.studentsTeams': 'Students & teams',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Enterprise',

    'footer.documentation': 'Documentation',
    'footer.templatesGuides': 'Templates & Guides',
    'footer.changelog': 'Changelog',
    'footer.roadmap': 'Roadmap',
    'footer.blog': 'Blog',
    'footer.referrals': 'Referrals',

    'footer.submitTicket': 'Submit Ticket',
    'footer.supportCenter': 'Support Center',
    'footer.emailSupport': 'Email Support',
    'footer.communityDiscord': 'Community Discord',

    'footer.pricing': 'Pricing',
    'footer.aboutNoska': 'About Noska',
    'footer.securityPrivacy': 'Security & Privacy',

    'footer.apiKeys': 'API Keys',
    'footer.mcpServer': 'MCP Server',
    'footer.plugins': 'Plugins',
    'footer.mcpDocs': 'MCP Documentation',

    'footer.emailPlaceholder': 'Your email address…',
    'footer.subscribe': 'Subscribe',
    'footer.subscribed': 'Subscribed!',
    'footer.copyright': '© {year} Noska Inc. All rights reserved.',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Refunds',
  },

  es: {
    'nav.product': 'Producto',
    'nav.solutions': 'Soluciones',
    'nav.resources': 'Recursos',
    'nav.developers': 'Desarrolladores',
    'nav.pricing': 'Precios',
    'nav.enterprise': 'Empresas',
    'nav.docs': 'Documentación',
    'nav.download': 'Descargar',
    'nav.whatsNew': 'Novedades',
    'nav.signIn': 'Iniciar Sesión',
    'nav.getStarted': 'Comenzar Gratis',
    'nav.openApp': 'Abrir App',

    'footer.product': 'Producto',
    'footer.solutions': 'Soluciones',
    'footer.resources': 'Recursos',
    'footer.helpSupport': 'Ayuda y Soporte',
    'footer.company': 'Compañía',
    'footer.developers': 'Desarrolladores',

    'footer.noskaAI': 'Noska AI y Documentos',
    'footer.noskaFlow': 'Noska Flow (Voz)',
    'footer.desktopApp': 'App de Escritorio',
    'footer.whatsNew': 'Novedades',

    'footer.personalUse': 'Uso Personal',
    'footer.studentsTeams': 'Estudiantes y Equipos',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Empresas',

    'footer.documentation': 'Documentación',
    'footer.templatesGuides': 'Plantillas y Guías',
    'footer.changelog': 'Historial de Cambios',
    'footer.roadmap': 'Hoja de Ruta',
    'footer.blog': 'Blog',
    'footer.referrals': 'Programa de Referidos',

    'footer.submitTicket': 'Enviar Ticket',
    'footer.supportCenter': 'Centro de Soporte',
    'footer.emailSupport': 'Soporte por Email',
    'footer.communityDiscord': 'Comunidad en Discord',

    'footer.pricing': 'Precios',
    'footer.aboutNoska': 'Sobre Noska',
    'footer.securityPrivacy': 'Seguridad y Privacidad',

    'footer.apiKeys': 'Claves de API',
    'footer.mcpServer': 'Servidor MCP',
    'footer.plugins': 'Extensiones y Plugins',
    'footer.mcpDocs': 'Docs del Protocolo MCP',

    'footer.emailPlaceholder': 'Tu correo electrónico…',
    'footer.subscribe': 'Suscribirse',
    'footer.subscribed': '¡Suscrito!',
    'footer.copyright': '© {year} Noska Inc. Todos los derechos reservados.',
    'footer.privacy': 'Privacidad',
    'footer.terms': 'Términos',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Reembolsos',
  },

  fr: {
    'nav.product': 'Produit',
    'nav.solutions': 'Solutions',
    'nav.resources': 'Ressources',
    'nav.developers': 'Développeurs',
    'nav.pricing': 'Tarifs',
    'nav.enterprise': 'Entreprise',
    'nav.docs': 'Documentation',
    'nav.download': 'Télécharger',
    'nav.whatsNew': 'Nouveautés',
    'nav.signIn': 'Connexion',
    'nav.getStarted': 'Commencer Gratuitement',
    'nav.openApp': 'Ouvrir l’App',

    'footer.product': 'Produit',
    'footer.solutions': 'Solutions',
    'footer.resources': 'Ressources',
    'footer.helpSupport': 'Aide & Support',
    'footer.company': 'Entreprise',
    'footer.developers': 'Développeurs',

    'footer.noskaAI': 'Noska IA & Notes',
    'footer.noskaFlow': 'Noska Flow (Voix)',
    'footer.desktopApp': 'Application Desktop',
    'footer.whatsNew': 'Nouveautés',

    'footer.personalUse': 'Usage Personnel',
    'footer.studentsTeams': 'Étudiants & Équipes',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Entreprise',

    'footer.documentation': 'Documentation',
    'footer.templatesGuides': 'Modèles & Guides',
    'footer.changelog': 'Journal des Mises à Jour',
    'footer.roadmap': 'Feuille de Route',
    'footer.blog': 'Blog',
    'footer.referrals': 'Parrainage',

    'footer.submitTicket': 'Ouvrir un Ticket',
    'footer.supportCenter': 'Centre d’Assistance',
    'footer.emailSupport': 'Support par Email',
    'footer.communityDiscord': 'Communauté Discord',

    'footer.pricing': 'Tarifs',
    'footer.aboutNoska': 'À Propos de Noska',
    'footer.securityPrivacy': 'Sécurité & Confidentialité',

    'footer.apiKeys': 'Clés API',
    'footer.mcpServer': 'Serveur MCP',
    'footer.plugins': 'Extensions & Plugins',
    'footer.mcpDocs': 'Documentation MCP',

    'footer.emailPlaceholder': 'Votre adresse email…',
    'footer.subscribe': 'S’abonner',
    'footer.subscribed': 'Inscrit !',
    'footer.copyright': '© {year} Noska Inc. Tous droits réservés.',
    'footer.privacy': 'Confidentialité',
    'footer.terms': 'Conditions',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Remboursements',
  },

  de: {
    'nav.product': 'Produkt',
    'nav.solutions': 'Lösungen',
    'nav.resources': 'Ressourcen',
    'nav.developers': 'Entwickler',
    'nav.pricing': 'Preise',
    'nav.enterprise': 'Unternehmen',
    'nav.docs': 'Dokumentation',
    'nav.download': 'Herunterladen',
    'nav.whatsNew': 'Neuigkeiten',
    'nav.signIn': 'Anmelden',
    'nav.getStarted': 'Kostenlos starten',
    'nav.openApp': 'App öffnen',

    'footer.product': 'Produkt',
    'footer.solutions': 'Lösungen',
    'footer.resources': 'Ressourcen',
    'footer.helpSupport': 'Hilfe & Support',
    'footer.company': 'Unternehmen',
    'footer.developers': 'Entwickler',

    'footer.noskaAI': 'Noska KI & Dokumente',
    'footer.noskaFlow': 'Noska Flow (Sprache)',
    'footer.desktopApp': 'Desktop-App',
    'footer.whatsNew': 'Neuigkeiten',

    'footer.personalUse': 'Persönliche Nutzung',
    'footer.studentsTeams': 'Studenten & Teams',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Unternehmen',

    'footer.documentation': 'Dokumentation',
    'footer.templatesGuides': 'Vorlagen & Anleitungen',
    'footer.changelog': 'Änderungsprotokoll',
    'footer.roadmap': 'Roadmap',
    'footer.blog': 'Blog',
    'footer.referrals': 'Empfehlungsprogramm',

    'footer.submitTicket': 'Ticket einreichen',
    'footer.supportCenter': 'Support-Zentrum',
    'footer.emailSupport': 'E-Mail-Support',
    'footer.communityDiscord': 'Discord-Community',

    'footer.pricing': 'Preise',
    'footer.aboutNoska': 'Über Noska',
    'footer.securityPrivacy': 'Sicherheit & Datenschutz',

    'footer.apiKeys': 'API-Schlüssel',
    'footer.mcpServer': 'MCP-Server',
    'footer.plugins': 'Plugins & Erweiterungen',
    'footer.mcpDocs': 'MCP-Dokumentation',

    'footer.emailPlaceholder': 'Ihre E-Mail-Adresse…',
    'footer.subscribe': 'Abonnieren',
    'footer.subscribed': 'Abonniert!',
    'footer.copyright': '© {year} Noska Inc. Alle Rechte vorbehalten.',
    'footer.privacy': 'Datenschutz',
    'footer.terms': 'AGB',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Rückerstattung',
  },

  ja: {
    'nav.product': '製品',
    'nav.solutions': 'ソリューション',
    'nav.resources': 'リソース',
    'nav.developers': '開発者',
    'nav.pricing': '料金プラン',
    'nav.enterprise': 'エンタープライズ',
    'nav.docs': 'ドキュメント',
    'nav.download': 'ダウンロード',
    'nav.whatsNew': '新機能・更新',
    'nav.signIn': 'ログイン',
    'nav.getStarted': '無料で始める',
    'nav.openApp': 'アプリを開く',

    'footer.product': '製品機能',
    'footer.solutions': 'ソリューション',
    'footer.resources': 'リソース',
    'footer.helpSupport': 'ヘルプ＆サポート',
    'footer.company': '企業情報',
    'footer.developers': '開発者向け',

    'footer.noskaAI': 'Noska AI ＆ ドキュメント',
    'footer.noskaFlow': 'Noska Flow 音声入力',
    'footer.desktopApp': 'デスクトップアプリ',
    'footer.whatsNew': '最新アップデート',

    'footer.personalUse': '個人利用',
    'footer.studentsTeams': '学生・チーム向け',
    'footer.startups': 'スタートアップ',
    'footer.enterprise': 'エンタープライズ',

    'footer.documentation': '公式ドキュメント',
    'footer.templatesGuides': 'テンプレート＆ガイド',
    'footer.changelog': '更新履歴',
    'footer.roadmap': 'ロードマップ',
    'footer.blog': '公式ブログ',
    'footer.referrals': '紹介プログラム',

    'footer.submitTicket': 'サポートチケット作成',
    'footer.supportCenter': 'サポートセンター',
    'footer.emailSupport': 'メールサポート',
    'footer.communityDiscord': 'Discordコミュニティ',

    'footer.pricing': '料金体系',
    'footer.aboutNoska': 'Noskaについて',
    'footer.securityPrivacy': 'セキュリティとプライバシー',

    'footer.apiKeys': 'APIキー管理',
    'footer.mcpServer': 'MCPサーバー',
    'footer.plugins': 'プラグイン一覧',
    'footer.mcpDocs': 'MCPプロトコル仕様書',

    'footer.emailPlaceholder': 'メールアドレスを入力…',
    'footer.subscribe': '登録する',
    'footer.subscribed': '登録完了！',
    'footer.copyright': '© {year} Noska Inc. 無断転載を禁じます。',
    'footer.privacy': 'プライバシーポリシー',
    'footer.terms': '利用規約',
    'footer.cookies': 'クッキー設定',
    'footer.refunds': '返金ポリシー',
  },

  zh: {
    'nav.product': '产品',
    'nav.solutions': '解决方案',
    'nav.resources': '资源中心',
    'nav.developers': '开发者',
    'nav.pricing': '价格方案',
    'nav.enterprise': '企业版',
    'nav.docs': '开发文档',
    'nav.download': '客户端下载',
    'nav.whatsNew': '最新发布',
    'nav.signIn': '登录',
    'nav.getStarted': '免费开始',
    'nav.openApp': '进入工作区',

    'footer.product': '产品矩阵',
    'footer.solutions': '解决方案',
    'footer.resources': '资源中心',
    'footer.helpSupport': '帮助与支持',
    'footer.company': '关于公司',
    'footer.developers': '开发者生态',

    'footer.noskaAI': 'Noska AI 与 文档',
    'footer.noskaFlow': 'Noska Flow 语音输入',
    'footer.desktopApp': '桌面客户端',
    'footer.whatsNew': '最新发布',

    'footer.personalUse': '个人使用',
    'footer.studentsTeams': '教育与团队',
    'footer.startups': '初创团队',
    'footer.enterprise': '企业定制',

    'footer.documentation': '官方文档',
    'footer.templatesGuides': '模版与使用指南',
    'footer.changelog': '更新日志',
    'footer.roadmap': '产品路线图',
    'footer.blog': '官方博客',
    'footer.referrals': '推广邀请计划',

    'footer.submitTicket': '提交工单',
    'footer.supportCenter': '帮助中心',
    'footer.emailSupport': '邮件技术支持',
    'footer.communityDiscord': 'Discord 开发者社区',

    'footer.pricing': '定价方案',
    'footer.aboutNoska': '关于 Noska',
    'footer.securityPrivacy': '安全与隐私政策',

    'footer.apiKeys': 'API 密钥配置',
    'footer.mcpServer': 'MCP 协议服务',
    'footer.plugins': '插件扩展中心',
    'footer.mcpDocs': 'MCP 开发者文档',

    'footer.emailPlaceholder': '输入您的邮箱地址…',
    'footer.subscribe': '订阅简报',
    'footer.subscribed': '订阅成功！',
    'footer.copyright': '© {year} Noska Inc. 保留所有权利。',
    'footer.privacy': '隐私条款',
    'footer.terms': '服务条款',
    'footer.cookies': 'Cookie 设置',
    'footer.refunds': '退款政策',
  },

  ko: {
    'nav.product': '제품',
    'nav.solutions': '솔루션',
    'nav.resources': '리소스',
    'nav.developers': '개발자',
    'nav.pricing': '요금제',
    'nav.enterprise': '엔터프라이즈',
    'nav.docs': '문서',
    'nav.download': '다운로드',
    'nav.whatsNew': '새로운 소식',
    'nav.signIn': '로그인',
    'nav.getStarted': '무료로 시작하기',
    'nav.openApp': '앱 열기',

    'footer.product': '제품',
    'footer.solutions': '솔루션',
    'footer.resources': '리소스',
    'footer.helpSupport': '도움말 및 지원',
    'footer.company': '회사',
    'footer.developers': '개발자',

    'footer.noskaAI': 'Noska AI 및 문서',
    'footer.noskaFlow': 'Noska Flow (음성)',
    'footer.desktopApp': '데스크톱 앱',
    'footer.whatsNew': '새로운 소식',

    'footer.personalUse': '개인용',
    'footer.studentsTeams': '학생 및 팀',
    'footer.startups': '스타트업',
    'footer.enterprise': '엔터프라이즈',

    'footer.documentation': '공식 문서',
    'footer.templatesGuides': '템플릿 및 가이드',
    'footer.changelog': '업데이트 내역',
    'footer.roadmap': '로드맵',
    'footer.blog': '블로그',
    'footer.referrals': '추천 프로그램',

    'footer.submitTicket': '문의 티켓 제출',
    'footer.supportCenter': '고객지원 센터',
    'footer.emailSupport': '이메일 문의',
    'footer.communityDiscord': 'Discord 커뮤니티',

    'footer.pricing': '요금 안내',
    'footer.aboutNoska': 'Noska 소개',
    'footer.securityPrivacy': '보안 및 개인정보 보호',

    'footer.apiKeys': 'API 키 발급',
    'footer.mcpServer': 'MCP 서버',
    'footer.plugins': '플러그인 마켓',
    'footer.mcpDocs': 'MCP 프로토콜 문서',

    'footer.emailPlaceholder': '이메일 주소를 입력하세요…',
    'footer.subscribe': '구독하기',
    'footer.subscribed': '구독 완료!',
    'footer.copyright': '© {year} Noska Inc. All rights reserved.',
    'footer.privacy': '개인정보처리방침',
    'footer.terms': '이용약관',
    'footer.cookies': '쿠키 정책',
    'footer.refunds': '환불 정책',
  },

  pt: {
    'nav.product': 'Produto',
    'nav.solutions': 'Soluções',
    'nav.resources': 'Recursos',
    'nav.developers': 'Desenvolvedores',
    'nav.pricing': 'Preços',
    'nav.enterprise': 'Empresas',
    'nav.docs': 'Documentação',
    'nav.download': 'Baixar',
    'nav.whatsNew': 'Novidades',
    'nav.signIn': 'Entrar',
    'nav.getStarted': 'Comece Grátis',
    'nav.openApp': 'Abrir App',

    'footer.product': 'Produto',
    'footer.solutions': 'Soluções',
    'footer.resources': 'Recursos',
    'footer.helpSupport': 'Ajuda & Suporte',
    'footer.company': 'Empresa',
    'footer.developers': 'Desenvolvedores',

    'footer.noskaAI': 'Noska AI & Notas',
    'footer.noskaFlow': 'Noska Flow (Voz)',
    'footer.desktopApp': 'App para Desktop',
    'footer.whatsNew': 'Novidades',

    'footer.personalUse': 'Uso Pessoal',
    'footer.studentsTeams': 'Estudantes & Equipes',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Empresarial',

    'footer.documentation': 'Documentação',
    'footer.templatesGuides': 'Modelos & Tutoriais',
    'footer.changelog': 'Registro de Mudanças',
    'footer.roadmap': 'Roteiro de Novidades',
    'footer.blog': 'Blog',
    'footer.referrals': 'Indicações',

    'footer.submitTicket': 'Abrir Chamado',
    'footer.supportCenter': 'Central de Ajuda',
    'footer.emailSupport': 'Suporte por E-mail',
    'footer.communityDiscord': 'Comunidade no Discord',

    'footer.pricing': 'Planos & Preços',
    'footer.aboutNoska': 'Sobre a Noska',
    'footer.securityPrivacy': 'Segurança & Privacidade',

    'footer.apiKeys': 'Chaves de API',
    'footer.mcpServer': 'Servidor MCP',
    'footer.plugins': 'Plugins & Extensões',
    'footer.mcpDocs': 'Documentação do MCP',

    'footer.emailPlaceholder': 'Seu melhor e-mail…',
    'footer.subscribe': 'Inscrever-se',
    'footer.subscribed': 'Inscrito!',
    'footer.copyright': '© {year} Noska Inc. Todos os direitos reservados.',
    'footer.privacy': 'Privacidade',
    'footer.terms': 'Termos',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Reembolsos',
  },

  it: {
    'nav.product': 'Prodotto',
    'nav.solutions': 'Soluzioni',
    'nav.resources': 'Risorse',
    'nav.developers': 'Sviluppatori',
    'nav.pricing': 'Prezzi',
    'nav.enterprise': 'Aziende',
    'nav.docs': 'Documentazione',
    'nav.download': 'Scarica',
    'nav.whatsNew': 'Novità',
    'nav.signIn': 'Accedi',
    'nav.getStarted': 'Inizia Gratis',
    'nav.openApp': 'Apri App',

    'footer.product': 'Prodotto',
    'footer.solutions': 'Soluzioni',
    'footer.resources': 'Risorse',
    'footer.helpSupport': 'Aiuto & Supporto',
    'footer.company': 'Azienda',
    'footer.developers': 'Sviluppatori',

    'footer.noskaAI': 'Noska IA & Note',
    'footer.noskaFlow': 'Noska Flow (Voce)',
    'footer.desktopApp': 'App Desktop',
    'footer.whatsNew': 'Novità',

    'footer.personalUse': 'Uso Personale',
    'footer.studentsTeams': 'Studenti & Team',
    'footer.startups': 'Startup',
    'footer.enterprise': 'Enterprise',

    'footer.documentation': 'Documentazione',
    'footer.templatesGuides': 'Modelli & Guide',
    'footer.changelog': 'Changelog',
    'footer.roadmap': 'Roadmap',
    'footer.blog': 'Blog',
    'footer.referrals': 'Programma Inviti',

    'footer.submitTicket': 'Invia Ticket',
    'footer.supportCenter': 'Centro Supporto',
    'footer.emailSupport': 'Supporto Email',
    'footer.communityDiscord': 'Community Discord',

    'footer.pricing': 'Listino Prezzi',
    'footer.aboutNoska': 'Chi Siamo',
    'footer.securityPrivacy': 'Sicurezza & Privacy',

    'footer.apiKeys': 'Chiavi API',
    'footer.mcpServer': 'Server MCP',
    'footer.plugins': 'Plugin ed Estensioni',
    'footer.mcpDocs': 'Documentazione MCP',

    'footer.emailPlaceholder': 'La tua email…',
    'footer.subscribe': 'Iscriviti',
    'footer.subscribed': 'Iscritto!',
    'footer.copyright': '© {year} Noska Inc. Tutti i diritti riservati.',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Termini',
    'footer.cookies': 'Cookie',
    'footer.refunds': 'Rimborsi',
  },

  nl: {
    'nav.product': 'Product',
    'nav.solutions': 'Oplossingen',
    'nav.resources': 'Bronnen',
    'nav.developers': 'Ontwikkelaars',
    'nav.pricing': 'Prijzen',
    'nav.enterprise': 'Zakelijk',
    'nav.docs': 'Documentatie',
    'nav.download': 'Downloaden',
    'nav.whatsNew': 'Wat is nieuw',
    'nav.signIn': 'Inloggen',
    'nav.getStarted': 'Gratis starten',
    'nav.openApp': 'App openen',

    'footer.product': 'Product',
    'footer.solutions': 'Oplossingen',
    'footer.resources': 'Bronnen',
    'footer.helpSupport': 'Hulp & Ondersteuning',
    'footer.company': 'Bedrijf',
    'footer.developers': 'Ontwikkelaars',

    'footer.noskaAI': 'Noska AI & Notities',
    'footer.noskaFlow': 'Noska Flow (Spraak)',
    'footer.desktopApp': 'Desktop-app',
    'footer.whatsNew': 'Wat is nieuw',

    'footer.personalUse': 'Persoonlijk gebruik',
    'footer.studentsTeams': 'Studenten & Teams',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Enterprise',

    'footer.documentation': 'Documentatie',
    'footer.templatesGuides': 'Sjablonen & Gidsen',
    'footer.changelog': 'Changelog',
    'footer.roadmap': 'Roadmap',
    'footer.blog': 'Blog',
    'footer.referrals': 'Verwijzingen',

    'footer.submitTicket': 'Ticket indienen',
    'footer.supportCenter': 'Ondersteuningscentrum',
    'footer.emailSupport': 'E-mailondersteuning',
    'footer.communityDiscord': 'Discord-gemeenschap',

    'footer.pricing': 'Prijzen',
    'footer.aboutNoska': 'Over Noska',
    'footer.securityPrivacy': 'Beveiliging & Privacy',

    'footer.apiKeys': 'API-sleutels',
    'footer.mcpServer': 'MCP-server',
    'footer.plugins': 'Plugins',
    'footer.mcpDocs': 'MCP-documentatie',

    'footer.emailPlaceholder': 'Uw e-mailadres…',
    'footer.subscribe': 'Abonneren',
    'footer.subscribed': 'Geabonneerd!',
    'footer.copyright': '© {year} Noska Inc. Alle rechten voorbehouden.',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Voorwaarden',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Restituties',
  },

  hi: {
    'nav.product': 'उत्पाद',
    'nav.solutions': 'समाधान',
    'nav.resources': 'संसाधन',
    'nav.developers': 'डेवलपर्स',
    'nav.pricing': 'मूल्य निर्धारण',
    'nav.enterprise': 'एंटरप्राइज',
    'nav.docs': 'दस्तावेज़',
    'nav.download': 'डाउनलोड',
    'nav.whatsNew': 'नया क्या है',
    'nav.signIn': 'साइन इन',
    'nav.getStarted': 'मुफ़्त में शुरू करें',
    'nav.openApp': 'ऐप खोलें',

    'footer.product': 'उत्पाद',
    'footer.solutions': 'समाधान',
    'footer.resources': 'संसाधन',
    'footer.helpSupport': 'सहायता और समर्थन',
    'footer.company': 'कंपनी',
    'footer.developers': 'डेवलपर्स',

    'footer.noskaAI': 'Noska AI और दस्तावेज़',
    'footer.noskaFlow': 'Noska Flow (वॉइस)',
    'footer.desktopApp': 'डेस्कटॉप ऐप',
    'footer.whatsNew': 'नया क्या है',

    'footer.personalUse': 'व्यक्तिगत उपयोग',
    'footer.studentsTeams': 'छात्र और टीमें',
    'footer.startups': 'स्टार्टअप्स',
    'footer.enterprise': 'एंटरप्राइज',

    'footer.documentation': 'दस्तावेज़ीकरण',
    'footer.templatesGuides': 'टेम्पलेट्स और गाइड',
    'footer.changelog': 'अपडेट इतिहास',
    'footer.roadmap': 'रोडमैप',
    'footer.blog': 'ब्लॉग',
    'footer.referrals': 'रेफरल कार्यक्रम',

    'footer.submitTicket': 'टिकट जमा करें',
    'footer.supportCenter': 'सहायता केंद्र',
    'footer.emailSupport': 'ईमेल सहायता',
    'footer.communityDiscord': 'Discord समुदाय',

    'footer.pricing': 'योजनाएं और मूल्य',
    'footer.aboutNoska': 'Noska के बारे में',
    'footer.securityPrivacy': 'सुरक्षा और गोपनीयता',

    'footer.apiKeys': 'API कुंजी',
    'footer.mcpServer': 'MCP सर्वर',
    'footer.plugins': 'प्लगइन्स',
    'footer.mcpDocs': 'MCP दस्तावेज़',

    'footer.emailPlaceholder': 'अपना ईमेल पता दर्ज करें…',
    'footer.subscribe': 'सदस्यता लें',
    'footer.subscribed': 'सफल सदस्यता!',
    'footer.copyright': '© {year} Noska Inc. सर्वाधिकार सुरक्षित।',
    'footer.privacy': 'गोपनीयता',
    'footer.terms': 'शर्तें',
    'footer.cookies': 'कुकीज़',
    'footer.refunds': 'रिफंड नीति',
  },

  ar: {
    'nav.product': 'المنتج',
    'nav.solutions': 'الحلول',
    'nav.resources': 'الموارد',
    'nav.developers': 'المطورين',
    'nav.pricing': 'الأسعار',
    'nav.enterprise': 'المؤسسات',
    'nav.docs': 'التوثيق',
    'nav.download': 'تحميل',
    'nav.whatsNew': 'ما الجديد',
    'nav.signIn': 'تسجيل الدخول',
    'nav.getStarted': 'ابدأ مجاناً',
    'nav.openApp': 'فتح التطبيق',

    'footer.product': 'المنتجات',
    'footer.solutions': 'الحلول',
    'footer.resources': 'الموارد',
    'footer.helpSupport': 'المساعدة والدعم',
    'footer.company': 'الشركة',
    'footer.developers': 'المطورين',

    'footer.noskaAI': 'Noska AI والمستندات',
    'footer.noskaFlow': 'Noska Flow (الصوت)',
    'footer.desktopApp': 'تطبيق الحاسوب',
    'footer.whatsNew': 'ما الجديد',

    'footer.personalUse': 'الاستخدام الشخصي',
    'footer.studentsTeams': 'الطلاب والفرق',
    'footer.startups': 'الشركات الناشئة',
    'footer.enterprise': 'المؤسسات الكبرى',

    'footer.documentation': 'التوثيق والمراجع',
    'footer.templatesGuides': 'القوالب والأدلة',
    'footer.changelog': 'سجل التحديثات',
    'footer.roadmap': 'خارطة الطريق',
    'footer.blog': 'المدونة',
    'footer.referrals': 'برنامج الإحالة',

    'footer.submitTicket': 'إرسال تذكرة دعم',
    'footer.supportCenter': 'مركز المساعدة',
    'footer.emailSupport': 'الدعم عبر البريد',
    'footer.communityDiscord': 'مجتمع ديسكورد',

    'footer.pricing': 'خطط الأسعار',
    'footer.aboutNoska': 'عن Noska',
    'footer.securityPrivacy': 'الأمان والخصوصية',

    'footer.apiKeys': 'مفاتيح API',
    'footer.mcpServer': 'خادم MCP',
    'footer.plugins': 'الإضافات والمكونات',
    'footer.mcpDocs': 'توثيق بروتوكول MCP',

    'footer.emailPlaceholder': 'أدخل بريدك الإلكتروني…',
    'footer.subscribe': 'اشتراك',
    'footer.subscribed': 'تم الاشتراك!',
    'footer.copyright': '© {year} Noska Inc. جميع الحقوق محفوظة.',
    'footer.privacy': 'الخصوصية',
    'footer.terms': 'الشروط',
    'footer.cookies': 'ملفات تعريف الارتباط',
    'footer.refunds': 'سياسة الاسترداد',
  },

  ru: {
    'nav.product': 'Продукт',
    'nav.solutions': 'Решения',
    'nav.resources': 'Ресурсы',
    'nav.developers': 'Разработчикам',
    'nav.pricing': 'Тарифы',
    'nav.enterprise': 'Для бизнеса',
    'nav.docs': 'Документация',
    'nav.download': 'Скачать',
    'nav.whatsNew': 'Что нового',
    'nav.signIn': 'Войти',
    'nav.getStarted': 'Начать бесплатно',
    'nav.openApp': 'Открыть приложение',

    'footer.product': 'Продукт',
    'footer.solutions': 'Решения',
    'footer.resources': 'Ресурсы',
    'footer.helpSupport': 'Помощь и поддержка',
    'footer.company': 'Компания',
    'footer.developers': 'Разработчикам',

    'footer.noskaAI': 'Noska ИИ и Документы',
    'footer.noskaFlow': 'Noska Flow (Голос)',
    'footer.desktopApp': 'Десктоп-приложение',
    'footer.whatsNew': 'Что нового',

    'footer.personalUse': 'Личное использование',
    'footer.studentsTeams': 'Студентам и командам',
    'footer.startups': 'Стартапам',
    'footer.enterprise': 'Корпоративным клиентам',

    'footer.documentation': 'Документация',
    'footer.templatesGuides': 'Шаблоны и гайды',
    'footer.changelog': 'История изменений',
    'footer.roadmap': 'План развития',
    'footer.blog': 'Блог',
    'footer.referrals': 'Реферальная программа',

    'footer.submitTicket': 'Создать тикет',
    'footer.supportCenter': 'Центр поддержки',
    'footer.emailSupport': 'Поддержка по почте',
    'footer.communityDiscord': 'Discord-сообщество',

    'footer.pricing': 'Тарифные планы',
    'footer.aboutNoska': 'О компании Noska',
    'footer.securityPrivacy': 'Безопасность и конфиденциальность',

    'footer.apiKeys': 'API-ключи',
    'footer.mcpServer': 'Сервер MCP',
    'footer.plugins': 'Каталог плагинов',
    'footer.mcpDocs': 'Документация MCP',

    'footer.emailPlaceholder': 'Ваш email…',
    'footer.subscribe': 'Подписаться',
    'footer.subscribed': 'Вы подписаны!',
    'footer.copyright': '© {year} Noska Inc. Все права защищены.',
    'footer.privacy': 'Конфиденциальность',
    'footer.terms': 'Условия',
    'footer.cookies': 'Файлы cookie',
    'footer.refunds': 'Возврат средств',
  },

  sv: {
    'nav.product': 'Produkt',
    'nav.solutions': 'Lösningar',
    'nav.resources': 'Resurser',
    'nav.developers': 'Utvecklare',
    'nav.pricing': 'Priser',
    'nav.enterprise': 'Företag',
    'nav.docs': 'Dokumentation',
    'nav.download': 'Ladda ner',
    'nav.whatsNew': 'Nyheter',
    'nav.signIn': 'Logga in',
    'nav.getStarted': 'Kom igång gratis',
    'nav.openApp': 'Öppna appen',

    'footer.product': 'Produkt',
    'footer.solutions': 'Lösningar',
    'footer.resources': 'Resurser',
    'footer.helpSupport': 'Hjälp & Support',
    'footer.company': 'Företag',
    'footer.developers': 'Utvecklare',

    'footer.noskaAI': 'Noska AI & Anteckningar',
    'footer.noskaFlow': 'Noska Flow (Röst)',
    'footer.desktopApp': 'Desktop-app',
    'footer.whatsNew': 'Nyheter',

    'footer.personalUse': 'Personlig användning',
    'footer.studentsTeams': 'Studenter & Team',
    'footer.startups': 'Startups',
    'footer.enterprise': 'Enterprise',

    'footer.documentation': 'Dokumentation',
    'footer.templatesGuides': 'Mallar & Guider',
    'footer.changelog': 'Ändringslogg',
    'footer.roadmap': 'Färdplan',
    'footer.blog': 'Blogg',
    'footer.referrals': 'Värvningsprogram',

    'footer.submitTicket': 'Skicka ärende',
    'footer.supportCenter': 'Supportcenter',
    'footer.emailSupport': 'E-postsupport',
    'footer.communityDiscord': 'Discord-community',

    'footer.pricing': 'Prissättning',
    'footer.aboutNoska': 'Om Noska',
    'footer.securityPrivacy': 'Säkerhet & Integritet',

    'footer.apiKeys': 'API-nycklar',
    'footer.mcpServer': 'MCP-server',
    'footer.plugins': 'Plugins & Tillägg',
    'footer.mcpDocs': 'MCP-dokumentation',

    'footer.emailPlaceholder': 'Din e-postadress…',
    'footer.subscribe': 'Prenumerera',
    'footer.subscribed': 'Prenumererad!',
    'footer.copyright': '© {year} Noska Inc. Alla rättigheter förbehållna.',
    'footer.privacy': 'Integritet',
    'footer.terms': 'Villkor',
    'footer.cookies': 'Cookies',
    'footer.refunds': 'Återbetalning',
  },

  tr: {
    'nav.product': 'Ürün',
    'nav.solutions': 'Çözümler',
    'nav.resources': 'Kaynaklar',
    'nav.developers': 'Geliştiriciler',
    'nav.pricing': 'Fiyatlandırma',
    'nav.enterprise': 'Kurumsal',
    'nav.docs': 'Belgeler',
    'nav.download': 'İndir',
    'nav.whatsNew': 'Yenilikler',
    'nav.signIn': 'Giriş Yap',
    'nav.getStarted': 'Ücretsiz Başla',
    'nav.openApp': 'Uygulamayı Aç',

    'footer.product': 'Ürün',
    'footer.solutions': 'Çözümler',
    'footer.resources': 'Kaynaklar',
    'footer.helpSupport': 'Yardım & Destek',
    'footer.company': 'Şirket',
    'footer.developers': 'Geliştiriciler',

    'footer.noskaAI': 'Noska Yapay Zeka & Belgeler',
    'footer.noskaFlow': 'Noska Flow (Sesli)',
    'footer.desktopApp': 'Masaüstü Uygulaması',
    'footer.whatsNew': 'Yenilikler',

    'footer.personalUse': 'Bireysel Kullanım',
    'footer.studentsTeams': 'Öğrenciler & Ekipler',
    'footer.startups': 'Girişimler',
    'footer.enterprise': 'Kurumsal',

    'footer.documentation': 'Belgeler & Kılavuzlar',
    'footer.templatesGuides': 'Şablonlar & Rehberler',
    'footer.changelog': 'Değişiklik Günlüğü',
    'footer.roadmap': 'Yol Haritası',
    'footer.blog': 'Blog',
    'footer.referrals': 'Tavsiye Programı',

    'footer.submitTicket': 'Destek Talebi Oluştur',
    'footer.supportCenter': 'Yardım Merkezi',
    'footer.emailSupport': 'E-posta Desteği',
    'footer.communityDiscord': 'Discord Topluluğu',

    'footer.pricing': 'Fiyatlandırma',
    'footer.aboutNoska': 'Noska Hakkında',
    'footer.securityPrivacy': 'Güvenlik & Gizlilik',

    'footer.apiKeys': 'API Anahtarları',
    'footer.mcpServer': 'MCP Sunucusu',
    'footer.plugins': 'Eklentiler',
    'footer.mcpDocs': 'MCP Dokümantasyonu',

    'footer.emailPlaceholder': 'E-posta adresiniz…',
    'footer.subscribe': 'Abone Ol',
    'footer.subscribed': 'Abone Olundu!',
    'footer.copyright': '© {year} Noska Inc. Tüm hakları saklıdır.',
    'footer.privacy': 'Gizlilik',
    'footer.terms': 'Kullanım Koşulları',
    'footer.cookies': 'Çerezler',
    'footer.refunds': 'İadeler',
  },

  pl: {
    'nav.product': 'Produkt',
    'nav.solutions': 'Rozwiązania',
    'nav.resources': 'Zasoby',
    'nav.developers': 'Programiści',
    'nav.pricing': 'Cennik',
    'nav.enterprise': 'Dla firm',
    'nav.docs': 'Dokumentacja',
    'nav.download': 'Pobierz',
    'nav.whatsNew': 'Co nowego',
    'nav.signIn': 'Zaloguj się',
    'nav.getStarted': 'Rozpocznij bezpłatnie',
    'nav.openApp': 'Otwórz aplikację',

    'footer.product': 'Produkt',
    'footer.solutions': 'Rozwiązania',
    'footer.resources': 'Zasoby',
    'footer.helpSupport': 'Pomoc i wsparcie',
    'footer.company': 'Firma',
    'footer.developers': 'Programiści',

    'footer.noskaAI': 'Noska AI i Notatki',
    'footer.noskaFlow': 'Noska Flow (Głos)',
    'footer.desktopApp': 'Aplikacja Desktop',
    'footer.whatsNew': 'Co nowego',

    'footer.personalUse': 'Użytek osobisty',
    'footer.studentsTeams': 'Studenci i zespoły',
    'footer.startups': 'Startupy',
    'footer.enterprise': 'Dla przedsiębiorstw',

    'footer.documentation': 'Dokumentacja',
    'footer.templatesGuides': 'Szablony i poradniki',
    'footer.changelog': 'Historia zmian',
    'footer.roadmap': 'Plan rozwoju',
    'footer.blog': 'Blog',
    'footer.referrals': 'Program poleceń',

    'footer.submitTicket': 'Zgłoś zgłoszenie',
    'footer.supportCenter': 'Centrum pomocy',
    'footer.emailSupport': 'Wsparcie e-mail',
    'footer.communityDiscord': 'Społeczność Discord',

    'footer.pricing': 'Cennik',
    'footer.aboutNoska': 'O Noska',
    'footer.securityPrivacy': 'Bezpieczeństwo i prywatność',

    'footer.apiKeys': 'Klucze API',
    'footer.mcpServer': 'Serwer MCP',
    'footer.plugins': 'Wtyczki i dodatki',
    'footer.mcpDocs': 'Dokumentacja MCP',

    'footer.emailPlaceholder': 'Twój adres e-mail…',
    'footer.subscribe': 'Subskrybuj',
    'footer.subscribed': 'Zapisano!',
    'footer.copyright': '© {year} Noska Inc. Wszelkie prawa zastrzeżone.',
    'footer.privacy': 'Prywatność',
    'footer.terms': 'Regulamin',
    'footer.cookies': 'Ciasteczka',
    'footer.refunds': 'Zwroty',
  },

  id: {
    'nav.product': 'Produk',
    'nav.solutions': 'Solusi',
    'nav.resources': 'Sumber Daya',
    'nav.developers': 'Pengembang',
    'nav.pricing': 'Harga',
    'nav.enterprise': 'Perusahaan',
    'nav.docs': 'Dokumentasi',
    'nav.download': 'Unduh',
    'nav.whatsNew': 'Yang Baru',
    'nav.signIn': 'Masuk',
    'nav.getStarted': 'Mulai Gratis',
    'nav.openApp': 'Buka Aplikasi',

    'footer.product': 'Produk',
    'footer.solutions': 'Solusi',
    'footer.resources': 'Sumber Daya',
    'footer.helpSupport': 'Bantuan & Dukungan',
    'footer.company': 'Perusahaan',
    'footer.developers': 'Pengembang',

    'footer.noskaAI': 'Noska AI & Dokumen',
    'footer.noskaFlow': 'Noska Flow (Suara)',
    'footer.desktopApp': 'Aplikasi Desktop',
    'footer.whatsNew': 'Yang Baru',

    'footer.personalUse': 'Penggunaan Pribadi',
    'footer.studentsTeams': 'Pelajar & Tim',
    'footer.startups': 'Startup',
    'footer.enterprise': 'Perusahaan',

    'footer.documentation': 'Dokumentasi Resmi',
    'footer.templatesGuides': 'Templat & Panduan',
    'footer.changelog': 'Catatan Rilis',
    'footer.roadmap': 'Peta Jalan',
    'footer.blog': 'Blog',
    'footer.referrals': 'Program Referral',

    'footer.submitTicket': 'Kirim Tiket',
    'footer.supportCenter': 'Pusat Bantuan',
    'footer.emailSupport': 'Dukungan Email',
    'footer.communityDiscord': 'Komunitas Discord',

    'footer.pricing': 'Daftar Harga',
    'footer.aboutNoska': 'Tentang Noska',
    'footer.securityPrivacy': 'Keamanan & Privasi',

    'footer.apiKeys': 'Kunci API',
    'footer.mcpServer': 'Server MCP',
    'footer.plugins': 'Plugin & Ekstensi',
    'footer.mcpDocs': 'Dokumentasi MCP',

    'footer.emailPlaceholder': 'Alamat email Anda…',
    'footer.subscribe': 'Berlangganan',
    'footer.subscribed': 'Berhasil Berlangganan!',
    'footer.copyright': '© {year} Noska Inc. Hak cipta dilindungi.',
    'footer.privacy': 'Privasi',
    'footer.terms': 'Ketentuan',
    'footer.cookies': 'Cookie',
    'footer.refunds': 'Pengembalian Dana',
  },
};

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'noska_marketing_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode;
      if (stored && TRANSLATIONS[stored]) {
        return stored;
      }
      // Auto-detect browser language if supported
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase() as LanguageCode;
      if (browserLang && TRANSLATIONS[browserLang]) {
        return browserLang;
      }
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    if (TRANSLATIONS[lang]) {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      const currentOpt = SUPPORTED_LANGUAGES.find(l => l.code === language);
      document.documentElement.dir = currentOpt?.dir || 'ltr';
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside Provider
    return {
      language: 'en' as LanguageCode,
      setLanguage: () => {},
      t: (key: string, fallback?: string) => fallback || key,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
