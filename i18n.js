// i18n.js - Internationalization for Vox Landing Page
// Supports: EN, PT-BR, PT-PT, ES, FR, DE, IT, RU, TR

// Translation dictionary
const translations = {
  'en': {
    meta: {
      title: 'Vox - Your Voice to Text. Secure. Accurate. Free.',
      description: 'Free open-source voice-to-text app. Designed for personal dictation and note-taking. Works completely offline with optional AI optimization. Available for macOS, with Windows and Linux support coming soon.',
      keywords: 'voice to text, speech recognition, personal dictation, transcription, macos, apple silicon, open source, privacy, local processing, dictation, voice input, menu bar app, free transcription, offline',
      ogTitle: 'Vox - Your voice to text. Secure. Accurate. Free.',
      ogDescription: '100% free and open-source. Designed for personal dictation and note-taking. Works completely offline on your computer with optional AI optimization.',
      ogImageAlt: 'Vox - Your voice to text. Secure. Accurate. Free.',
      twitterTitle: 'Vox - Your voice to text. Secure. Accurate. Free.',
      twitterDescription: '100% free and open-source voice-to-text app. Designed for personal dictation and note-taking with optional AI optimization.'
    },
    header: {
      logoAlt: 'Vox Homepage',
      logoText: 'Vox',
      themeToggle: 'Toggle theme'
    },
    hero: {
      title: 'Your voice to text.',
      titleAccent: 'Secure. Accurate. Free.',
      downloadButton: 'Download for macOS',
      platformNote: 'Currently available for macOS. Windows and Linux support coming soon.',
      starButton: 'Star on GitHub',
      demoHeader: 'How it works'
    },
    demo: {
      listening: 'Listening...',
      transcribing: 'Transcribing...',
      enhancing: 'Enhancing...',
      resultLabel: 'Result',
      sampleText: "Hey team, let's sync up tomorrow at 10 AM to discuss the new feature rollout. I'll share the design specs beforehand.",
      stages: {
        record: {
          title: 'Record',
          description: 'Press hotkey to record'
        },
        transcribe: {
          title: 'Transcribe',
          description: 'Whisper processes locally'
        },
        enhance: {
          title: 'AI Enhancement',
          description: 'Optional enhancement'
        },
        paste: {
          title: 'Paste',
          description: 'Clean text, ready to use'
        }
      }
    },
    privacy: {
      title: 'Your voice stays on your device',
      description: 'Designed for personal dictation and note-taking. Transcription runs entirely on your device - only the optional AI enhancement connects online.',
      features: {
        local: 'Local processing',
        noCloud: 'No cloud audio',
        openSource: 'Open source'
      }
    },
    footer: {
      builtBy: 'Built by the open-source community',
      docs: 'Docs',
      github: 'GitHub',
      license: 'MIT License'
    },
    platform: {
      comingSoon: 'Coming Soon',
      macOnly: 'Currently available for macOS only.',
      windowsLinuxSoon: 'Currently available for macOS only. Windows and Linux support coming soon.',
      iosSoon: 'Currently available for macOS only. iOS support coming soon.'
    }
  },
  'pt-BR': {
    meta: {
      title: 'Vox - Voz para Texto. Seguro. Preciso. Grátis.',
      description: 'App gratuito e open-source de voz para texto. Transcrição local com Whisper e melhorias opcionais com LLM. 100% privado - seu áudio nunca sai do seu dispositivo. Disponível para macOS, suporte para Windows e Linux em breve.',
      keywords: 'voz para texto, reconhecimento de fala, whisper, transcrição, macos, apple silicon, código aberto, privacidade, processamento local, ditado, entrada de voz, app de menu, transcrição grátis',
      ogTitle: 'Vox - Voz para texto. Seguro. Preciso. Grátis.',
      ogDescription: '100% gratuito e open-source. Transcrição local com Whisper e melhorias opcionais com LLM usando suas próprias chaves de API. Seu áudio nunca sai do seu dispositivo.',
      ogImageAlt: 'Vox - Voz para texto. Seguro. Preciso. Grátis.',
      twitterTitle: 'Vox - Voz para texto. Seguro. Preciso. Grátis.',
      twitterDescription: 'App 100% gratuito e open-source de voz para texto com transcrição local via Whisper e melhorias opcionais com LLM.'
    },
    header: {
      logoAlt: 'Página Inicial do Vox',
      logoText: 'Vox',
      themeToggle: 'Alternar tema'
    },
    hero: {
      title: 'Sua voz para texto.',
      titleAccent: 'Seguro. Preciso. Grátis.',
      downloadButton: 'Baixar para macOS',
      platformNote: 'Atualmente disponível para macOS. Suporte para Windows e Linux em breve.',
      starButton: 'Favoritar no GitHub',
      demoHeader: 'Como funciona'
    },
    demo: {
      listening: 'Ouvindo...',
      transcribing: 'Transcrevendo...',
      enhancing: 'Aprimorando...',
      resultLabel: 'Resultado',
      sampleText: 'Pessoal, vamos alinhar amanhã às 10h para discutir o lançamento da nova funcionalidade. Vou compartilhar as especificações de design antes.',
      stages: {
        record: {
          title: 'Gravar',
          description: 'Pressione o atalho para gravar'
        },
        transcribe: {
          title: 'Transcrever',
          description: 'Whisper processa localmente'
        },
        enhance: {
          title: 'Aprimoramento com IA',
          description: 'Aprimoramento opcional'
        },
        paste: {
          title: 'Colar',
          description: 'Texto limpo, pronto para usar'
        }
      }
    },
    privacy: {
      title: 'Sua voz fica no seu dispositivo',
      description: 'Projetado para ditado pessoal e anotações. A transcrição roda inteiramente no seu dispositivo - apenas o aprimoramento opcional de IA conecta online.',
      features: {
        local: 'Processamento local',
        noCloud: 'Sem áudio na nuvem',
        openSource: 'Código aberto'
      }
    },
    footer: {
      builtBy: 'Construído pela comunidade open-source',
      docs: 'Documentação',
      github: 'GitHub',
      license: 'Licença MIT'
    },
    platform: {
      comingSoon: 'Em Breve',
      macOnly: 'Atualmente disponível apenas para macOS.',
      windowsLinuxSoon: 'Atualmente disponível apenas para macOS. Suporte para Windows e Linux em breve.',
      iosSoon: 'Atualmente disponível apenas para macOS. Suporte para iOS em breve.'
    }
  },
  'pt-PT': {
    meta: {
      title: 'Vox - Voz para Texto. Seguro. Preciso. Gratuito.',
      description: 'Aplicação gratuita e open-source de voz para texto. Transcrição local com Whisper e melhorias opcionais com LLM. 100% privado - o seu áudio nunca sai do seu dispositivo. Disponível para macOS, suporte para Windows e Linux em breve.',
      keywords: 'voz para texto, reconhecimento de voz, whisper, transcrição, macos, apple silicon, código aberto, privacidade, processamento local, ditado, entrada de voz, aplicação de menu, transcrição gratuita',
      ogTitle: 'Vox - Voz para texto. Seguro. Preciso. Gratuito.',
      ogDescription: '100% gratuito e open-source. Transcrição local com Whisper e melhorias opcionais com LLM usando as suas próprias chaves de API. O seu áudio nunca sai do seu dispositivo.',
      ogImageAlt: 'Vox - Voz para texto. Seguro. Preciso. Gratuito.',
      twitterTitle: 'Vox - Voz para texto. Seguro. Preciso. Gratuito.',
      twitterDescription: 'Aplicação 100% gratuita e open-source de voz para texto com transcrição local via Whisper e melhorias opcionais com LLM.'
    },
    header: {
      logoAlt: 'Página Inicial do Vox',
      logoText: 'Vox',
      themeToggle: 'Alternar tema'
    },
    hero: {
      title: 'A sua voz para texto.',
      titleAccent: 'Seguro. Preciso. Gratuito.',
      downloadButton: 'Descarregar para macOS',
      platformNote: 'Atualmente disponível para macOS. Suporte para Windows e Linux em breve.',
      starButton: 'Dar estrela no GitHub',
      demoHeader: 'Como funciona'
    },
    demo: {
      listening: 'A ouvir...',
      transcribing: 'A transcrever...',
      enhancing: 'A melhorar...',
      resultLabel: 'Resultado',
      sampleText: 'Pessoal, vamos alinhar amanhã às 10h para discutir o lançamento da nova funcionalidade. Vou partilhar as especificações de design antes.',
      stages: {
        record: {
          title: 'Gravar',
          description: 'Prima o atalho para gravar'
        },
        transcribe: {
          title: 'Transcrever',
          description: 'Whisper processa localmente'
        },
        enhance: {
          title: 'Melhoria com IA',
          description: 'Melhoria opcional'
        },
        paste: {
          title: 'Colar',
          description: 'Texto limpo, pronto a usar'
        }
      }
    },
    privacy: {
      title: 'A sua voz fica no seu dispositivo',
      description: 'Projetado para ditado pessoal e anotações. A transcrição corre inteiramente no seu dispositivo - apenas a melhoria opcional de IA conecta online.',
      features: {
        local: 'Processamento local',
        noCloud: 'Sem áudio na nuvem',
        openSource: 'Código aberto'
      }
    },
    footer: {
      builtBy: 'Construído pela comunidade open-source',
      docs: 'Documentação',
      github: 'GitHub',
      license: 'Licença MIT'
    },
    platform: {
      comingSoon: 'Em Breve',
      macOnly: 'Atualmente disponível apenas para macOS.',
      windowsLinuxSoon: 'Atualmente disponível apenas para macOS. Suporte para Windows e Linux em breve.',
      iosSoon: 'Atualmente disponível apenas para macOS. Suporte para iOS em breve.'
    }
  },
  'es': {
    meta: {
      title: 'Vox - Voz a Texto. Seguro. Preciso. Gratis.',
      description: 'Aplicación gratuita y de código abierto de voz a texto. Transcripción local con Whisper y mejoras opcionales con LLM. 100% privado - tu audio nunca sale de tu dispositivo. Disponible para macOS, soporte para Windows y Linux próximamente.',
      keywords: 'voz a texto, reconocimiento de voz, whisper, transcripción, macos, apple silicon, código abierto, privacidad, procesamiento local, dictado, entrada de voz, aplicación de menú, transcripción gratuita',
      ogTitle: 'Vox - Voz a texto. Seguro. Preciso. Gratis.',
      ogDescription: '100% gratuito y de código abierto. Transcripción local con Whisper y mejoras opcionales con LLM usando tus propias claves API. Tu audio nunca sale de tu dispositivo.',
      ogImageAlt: 'Vox - Voz a texto. Seguro. Preciso. Gratis.',
      twitterTitle: 'Vox - Voz a texto. Seguro. Preciso. Gratis.',
      twitterDescription: 'Aplicación 100% gratuita y de código abierto de voz a texto con transcripción local vía Whisper y mejoras opcionales con LLM.'
    },
    header: {
      logoAlt: 'Página Principal de Vox',
      logoText: 'Vox',
      themeToggle: 'Cambiar tema'
    },
    hero: {
      title: 'Tu voz a texto.',
      titleAccent: 'Seguro. Preciso. Gratis.',
      downloadButton: 'Descargar para macOS',
      platformNote: 'Actualmente disponible para macOS. Soporte para Windows y Linux próximamente.',
      starButton: 'Dar estrella en GitHub',
      demoHeader: 'Cómo funciona'
    },
    demo: {
      listening: 'Escuchando...',
      transcribing: 'Transcribiendo...',
      enhancing: 'Mejorando...',
      resultLabel: 'Resultado',
      sampleText: 'Equipo, sincronizemos mañana a las 10 AM para discutir el lanzamiento de la nueva función. Compartiré las especificaciones de diseño antes.',
      stages: {
        record: {
          title: 'Grabar',
          description: 'Presiona el atajo para grabar'
        },
        transcribe: {
          title: 'Transcribir',
          description: 'Whisper procesa localmente'
        },
        enhance: {
          title: 'Mejora con IA',
          description: 'Mejora opcional'
        },
        paste: {
          title: 'Pegar',
          description: 'Texto limpio, listo para usar'
        }
      }
    },
    privacy: {
      title: 'Tu voz permanece en tu dispositivo',
      description: 'Diseñado para dictado personal y toma de notas. La transcripción se ejecuta completamente en tu dispositivo - solo la mejora opcional de IA se conecta en línea.',
      features: {
        local: 'Procesamiento local',
        noCloud: 'Sin audio en la nube',
        openSource: 'Código abierto'
      }
    },
    footer: {
      builtBy: 'Construido por la comunidad de código abierto',
      docs: 'Documentación',
      github: 'GitHub',
      license: 'Licencia MIT'
    },
    platform: {
      comingSoon: 'Próximamente',
      macOnly: 'Actualmente disponible solo para macOS.',
      windowsLinuxSoon: 'Actualmente disponible solo para macOS. Soporte para Windows y Linux próximamente.',
      iosSoon: 'Actualmente disponible solo para macOS. Soporte para iOS próximamente.'
    }
  },
  'fr': {
    meta: {
      title: 'Vox - Voix vers Texte. Sécurisé. Précis. Gratuit.',
      description: 'Application gratuite et open-source de voix vers texte. Transcription locale avec Whisper et améliorations optionnelles avec LLM. 100% privé - votre audio ne quitte jamais votre appareil. Disponible pour macOS, support Windows et Linux bientôt.',
      keywords: 'voix vers texte, reconnaissance vocale, whisper, transcription, macos, apple silicon, open source, confidentialité, traitement local, dictée, entrée vocale, application menu, transcription gratuite',
      ogTitle: 'Vox - Voix vers texte. Sécurisé. Précis. Gratuit.',
      ogDescription: '100% gratuit et open-source. Transcription locale avec Whisper et améliorations optionnelles avec LLM en utilisant vos propres clés API. Votre audio ne quitte jamais votre appareil.',
      ogImageAlt: 'Vox - Voix vers texte. Sécurisé. Précis. Gratuit.',
      twitterTitle: 'Vox - Voix vers texte. Sécurisé. Précis. Gratuit.',
      twitterDescription: 'Application 100% gratuite et open-source de voix vers texte avec transcription locale via Whisper et améliorations optionnelles avec LLM.'
    },
    header: {
      logoAlt: 'Page d\'accueil Vox',
      logoText: 'Vox',
      themeToggle: 'Basculer le thème'
    },
    hero: {
      title: 'Votre voix vers texte.',
      titleAccent: 'Sécurisé. Précis. Gratuit.',
      downloadButton: 'Télécharger pour macOS',
      platformNote: 'Actuellement disponible pour macOS. Support Windows et Linux bientôt.',
      starButton: 'Mettre une étoile sur GitHub',
      demoHeader: 'Comment ça marche'
    },
    demo: {
      listening: 'Écoute...',
      transcribing: 'Transcription...',
      enhancing: 'Amélioration...',
      resultLabel: 'Résultat',
      sampleText: 'Équipe, synchronisons-nous demain à 10h pour discuter du déploiement de la nouvelle fonctionnalité. Je partagerai les spécifications de conception au préalable.',
      stages: {
        record: {
          title: 'Enregistrer',
          description: 'Appuyez sur le raccourci pour enregistrer'
        },
        transcribe: {
          title: 'Transcrire',
          description: 'Whisper traite localement'
        },
        enhance: {
          title: 'Amélioration IA',
          description: 'Amélioration optionnelle'
        },
        paste: {
          title: 'Coller',
          description: 'Texte propre, prêt à l\'emploi'
        }
      }
    },
    privacy: {
      title: 'Votre voix reste sur votre appareil',
      description: 'Conçu pour la dictée personnelle et la prise de notes. La transcription s\'exécute entièrement sur votre appareil - seule l\'amélioration IA optionnelle se connecte en ligne.',
      features: {
        local: 'Traitement local',
        noCloud: 'Pas d\'audio dans le cloud',
        openSource: 'Open source'
      }
    },
    footer: {
      builtBy: 'Construit par la communauté open-source',
      docs: 'Documentation',
      github: 'GitHub',
      license: 'Licence MIT'
    },
    platform: {
      comingSoon: 'Bientôt disponible',
      macOnly: 'Actuellement disponible uniquement pour macOS.',
      windowsLinuxSoon: 'Actuellement disponible uniquement pour macOS. Support Windows et Linux bientôt.',
      iosSoon: 'Actuellement disponible uniquement pour macOS. Support iOS bientôt.'
    }
  },
  'de': {
    meta: {
      title: 'Vox - Sprache zu Text. Sicher. Genau. Kostenlos.',
      description: 'Kostenlose Open-Source-Sprache-zu-Text-App. Lokale Whisper-Transkription mit optionaler LLM-Verbesserung. 100% privat - Ihr Audio verlässt niemals Ihr Gerät. Verfügbar für macOS, Windows- und Linux-Unterstützung in Kürze.',
      keywords: 'sprache zu text, spracherkennung, whisper, transkription, macos, apple silicon, open source, datenschutz, lokale verarbeitung, diktat, spracheingabe, menüleisten-app, kostenlose transkription',
      ogTitle: 'Vox - Sprache zu Text. Sicher. Genau. Kostenlos.',
      ogDescription: '100% kostenlos und Open-Source. Lokale Whisper-Transkription mit optionaler LLM-Verbesserung mit Ihren eigenen API-Schlüsseln. Ihr Audio verlässt niemals Ihr Gerät.',
      ogImageAlt: 'Vox - Sprache zu Text. Sicher. Genau. Kostenlos.',
      twitterTitle: 'Vox - Sprache zu Text. Sicher. Genau. Kostenlos.',
      twitterDescription: '100% kostenlose und Open-Source-Sprache-zu-Text-App mit lokaler Whisper-Transkription und optionaler LLM-Verbesserung.'
    },
    header: {
      logoAlt: 'Vox Startseite',
      logoText: 'Vox',
      themeToggle: 'Design umschalten'
    },
    hero: {
      title: 'Ihre Stimme zu Text.',
      titleAccent: 'Sicher. Genau. Kostenlos.',
      downloadButton: 'Für macOS herunterladen',
      platformNote: 'Derzeit für macOS verfügbar. Windows- und Linux-Unterstützung in Kürze.',
      starButton: 'Auf GitHub mit Stern markieren',
      demoHeader: 'So funktioniert es'
    },
    demo: {
      listening: 'Hört zu...',
      transcribing: 'Transkribiert...',
      enhancing: 'Verbessert...',
      resultLabel: 'Ergebnis',
      sampleText: 'Team, lasst uns morgen um 10 Uhr synchronisieren, um den Rollout des neuen Features zu besprechen. Ich werde die Design-Spezifikationen vorher teilen.',
      stages: {
        record: {
          title: 'Aufnehmen',
          description: 'Tastenkombination zum Aufnehmen drücken'
        },
        transcribe: {
          title: 'Transkribieren',
          description: 'Whisper verarbeitet lokal'
        },
        enhance: {
          title: 'KI-Verbesserung',
          description: 'Optionale Verbesserung'
        },
        paste: {
          title: 'Einfügen',
          description: 'Sauberer Text, einsatzbereit'
        }
      }
    },
    privacy: {
      title: 'Ihre Stimme bleibt auf Ihrem Gerät',
      description: 'Entwickelt für persönliche Diktate und Notizen. Die Transkription läuft vollständig auf Ihrem Gerät - nur die optionale KI-Verbesserung verbindet sich online.',
      features: {
        local: 'Lokale Verarbeitung',
        noCloud: 'Kein Cloud-Audio',
        openSource: 'Open Source'
      }
    },
    footer: {
      builtBy: 'Von der Open-Source-Community erstellt',
      docs: 'Dokumentation',
      github: 'GitHub',
      license: 'MIT-Lizenz'
    },
    platform: {
      comingSoon: 'Demnächst',
      macOnly: 'Derzeit nur für macOS verfügbar.',
      windowsLinuxSoon: 'Derzeit nur für macOS verfügbar. Windows- und Linux-Unterstützung in Kürze.',
      iosSoon: 'Derzeit nur für macOS verfügbar. iOS-Unterstützung in Kürze.'
    }
  },
  'it': {
    meta: {
      title: 'Vox - Voce a Testo. Sicuro. Accurato. Gratuito.',
      description: 'App gratuita e open-source di voce a testo. Trascrizione locale con Whisper e miglioramenti opzionali con LLM. 100% privato - il tuo audio non lascia mai il tuo dispositivo. Disponibile per macOS, supporto Windows e Linux in arrivo.',
      keywords: 'voce a testo, riconoscimento vocale, whisper, trascrizione, macos, apple silicon, open source, privacy, elaborazione locale, dettatura, input vocale, app menu, trascrizione gratuita',
      ogTitle: 'Vox - Voce a testo. Sicuro. Accurato. Gratuito.',
      ogDescription: '100% gratuito e open-source. Trascrizione locale con Whisper e miglioramenti opzionali con LLM usando le tue chiavi API. Il tuo audio non lascia mai il tuo dispositivo.',
      ogImageAlt: 'Vox - Voce a testo. Sicuro. Accurato. Gratuito.',
      twitterTitle: 'Vox - Voce a testo. Sicuro. Accurato. Gratuito.',
      twitterDescription: 'App 100% gratuita e open-source di voce a testo con trascrizione locale via Whisper e miglioramenti opzionali con LLM.'
    },
    header: {
      logoAlt: 'Homepage di Vox',
      logoText: 'Vox',
      themeToggle: 'Cambia tema'
    },
    hero: {
      title: 'La tua voce a testo.',
      titleAccent: 'Sicuro. Accurato. Gratuito.',
      downloadButton: 'Scarica per macOS',
      platformNote: 'Attualmente disponibile per macOS. Supporto Windows e Linux in arrivo.',
      starButton: 'Metti una stella su GitHub',
      demoHeader: 'Come funziona'
    },
    demo: {
      listening: 'In ascolto...',
      transcribing: 'Trascrizione...',
      enhancing: 'Miglioramento...',
      resultLabel: 'Risultato',
      sampleText: 'Team, sincronizziamoci domani alle 10 per discutere il lancio della nuova funzionalità. Condividerò le specifiche di design in anticipo.',
      stages: {
        record: {
          title: 'Registra',
          description: 'Premi la scorciatoia per registrare'
        },
        transcribe: {
          title: 'Trascrivi',
          description: 'Whisper elabora localmente'
        },
        enhance: {
          title: 'Miglioramento IA',
          description: 'Miglioramento opzionale'
        },
        paste: {
          title: 'Incolla',
          description: 'Testo pulito, pronto all\'uso'
        }
      }
    },
    privacy: {
      title: 'La tua voce rimane sul tuo dispositivo',
      description: 'Progettato per dettatura personale e presa di appunti. La trascrizione viene eseguita interamente sul tuo dispositivo - solo il miglioramento IA opzionale si connette online.',
      features: {
        local: 'Elaborazione locale',
        noCloud: 'Nessun audio nel cloud',
        openSource: 'Open source'
      }
    },
    footer: {
      builtBy: 'Costruito dalla comunità open-source',
      docs: 'Documentazione',
      github: 'GitHub',
      license: 'Licenza MIT'
    },
    platform: {
      comingSoon: 'Prossimamente',
      macOnly: 'Attualmente disponibile solo per macOS.',
      windowsLinuxSoon: 'Attualmente disponibile solo per macOS. Supporto Windows e Linux in arrivo.',
      iosSoon: 'Attualmente disponibile solo per macOS. Supporto iOS in arrivo.'
    }
  },
  'ru': {
    meta: {
      title: 'Vox - Голос в Текст. Безопасно. Точно. Бесплатно.',
      description: 'Бесплатное open-source приложение для преобразования голоса в текст. Локальная транскрипция с Whisper и опциональное улучшение с LLM. 100% конфиденциально - ваш аудио никогда не покидает устройство. Доступно для macOS, поддержка Windows и Linux скоро.',
      keywords: 'голос в текст, распознавание речи, whisper, транскрипция, macos, apple silicon, открытый код, конфиденциальность, локальная обработка, диктовка, голосовой ввод, приложение меню, бесплатная транскрипция',
      ogTitle: 'Vox - Голос в текст. Безопасно. Точно. Бесплатно.',
      ogDescription: '100% бесплатно и open-source. Локальная транскрипция с Whisper и опциональное улучшение с LLM с использованием ваших API ключей. Ваш аудио никогда не покидает устройство.',
      ogImageAlt: 'Vox - Голос в текст. Безопасно. Точно. Бесплатно.',
      twitterTitle: 'Vox - Голос в текст. Безопасно. Точно. Бесплатно.',
      twitterDescription: '100% бесплатное и open-source приложение для преобразования голоса в текст с локальной транскрипцией через Whisper и опциональным улучшением с LLM.'
    },
    header: {
      logoAlt: 'Главная страница Vox',
      logoText: 'Vox',
      themeToggle: 'Переключить тему'
    },
    hero: {
      title: 'Ваш голос в текст.',
      titleAccent: 'Безопасно. Точно. Бесплатно.',
      downloadButton: 'Скачать для macOS',
      platformNote: 'В настоящее время доступно для macOS. Поддержка Windows и Linux скоро.',
      starButton: 'Поставить звезду на GitHub',
      demoHeader: 'Как это работает'
    },
    demo: {
      listening: 'Слушаю...',
      transcribing: 'Транскрибирую...',
      enhancing: 'Улучшаю...',
      resultLabel: 'Результат',
      sampleText: 'Команда, давайте встретимся завтра в 10 утра, чтобы обсудить запуск новой функции. Я поделюсь спецификациями дизайна заранее.',
      stages: {
        record: {
          title: 'Запись',
          description: 'Нажмите горячую клавишу для записи'
        },
        transcribe: {
          title: 'Транскрипция',
          description: 'Whisper обрабатывает локально'
        },
        enhance: {
          title: 'ИИ Улучшение',
          description: 'Опциональное улучшение'
        },
        paste: {
          title: 'Вставка',
          description: 'Чистый текст, готов к использованию'
        }
      }
    },
    privacy: {
      title: 'Ваш голос остаётся на вашем устройстве',
      description: 'Разработано для личной диктовки и заметок. Транскрипция выполняется полностью на вашем устройстве - только опциональное улучшение ИИ подключается онлайн.',
      features: {
        local: 'Локальная обработка',
        noCloud: 'Нет аудио в облаке',
        openSource: 'Открытый код'
      }
    },
    footer: {
      builtBy: 'Создано open-source сообществом',
      docs: 'Документация',
      github: 'GitHub',
      license: 'Лицензия MIT'
    },
    platform: {
      comingSoon: 'Скоро',
      macOnly: 'В настоящее время доступно только для macOS.',
      windowsLinuxSoon: 'В настоящее время доступно только для macOS. Поддержка Windows и Linux скоро.',
      iosSoon: 'В настоящее время доступно только для macOS. Поддержка iOS скоро.'
    }
  },
  'tr': {
    meta: {
      title: 'Vox - Ses den Metne. Güvenli. Doğru. Ücretsiz.',
      description: 'Ücretsiz ve açık kaynak ses-metin uygulaması. Whisper ile yerel transkripsiyon ve isteğe bağlı LLM iyileştirmesi. %100 gizli - sesiniz cihazınızdan asla ayrılmaz. macOS için mevcut, Windows ve Linux desteği yakında.',
      keywords: 'ses den metne, konuşma tanıma, whisper, transkripsiyon, macos, apple silicon, açık kaynak, gizlilik, yerel işleme, dikte, ses girişi, menü çubuğu uygulaması, ücretsiz transkripsiyon',
      ogTitle: 'Vox - Ses den metne. Güvenli. Doğru. Ücretsiz.',
      ogDescription: '%100 ücretsiz ve açık kaynak. Kendi API anahtarlarınızı kullanarak Whisper ile yerel transkripsiyon ve isteğe bağlı LLM iyileştirmesi. Sesiniz cihazınızdan asla ayrılmaz.',
      ogImageAlt: 'Vox - Ses den metne. Güvenli. Doğru. Ücretsiz.',
      twitterTitle: 'Vox - Ses den metne. Güvenli. Doğru. Ücretsiz.',
      twitterDescription: 'Whisper ile yerel transkripsiyon ve isteğe bağlı LLM iyileştirmesi içeren %100 ücretsiz ve açık kaynak ses-metin uygulaması.'
    },
    header: {
      logoAlt: 'Vox Ana Sayfa',
      logoText: 'Vox',
      themeToggle: 'Temayı değiştir'
    },
    hero: {
      title: 'Sesiniz metne.',
      titleAccent: 'Güvenli. Doğru. Ücretsiz.',
      downloadButton: 'macOS için indir',
      platformNote: 'Şu anda macOS için mevcut. Windows ve Linux desteği yakında.',
      starButton: 'GitHub\'da yıldızla',
      demoHeader: 'Nasıl çalışır'
    },
    demo: {
      listening: 'Dinliyor...',
      transcribing: 'Yazıya dökülüyor...',
      enhancing: 'İyileştiriliyor...',
      resultLabel: 'Sonuç',
      sampleText: 'Ekip, yeni özellik lansmanını tartışmak için yarın saat 10\'da senkronize olalım. Tasarım özelliklerini önceden paylaşacağım.',
      stages: {
        record: {
          title: 'Kaydet',
          description: 'Kaydetmek için kısayola basın'
        },
        transcribe: {
          title: 'Yazıya Dök',
          description: 'Whisper yerel olarak işler'
        },
        enhance: {
          title: 'Yapay Zeka İyileştirmesi',
          description: 'İsteğe bağlı iyileştirme'
        },
        paste: {
          title: 'Yapıştır',
          description: 'Temiz metin, kullanıma hazır'
        }
      }
    },
    privacy: {
      title: 'Sesiniz cihazınızda kalır',
      description: 'Kişisel dikte ve not alma için tasarlandı. Transkripsiyon tamamen cihazınızda çalışır - yalnızca isteğe bağlı yapay zeka iyileştirmesi çevrimiçi bağlanır.',
      features: {
        local: 'Yerel işleme',
        noCloud: 'Bulutta ses yok',
        openSource: 'Açık kaynak'
      }
    },
    footer: {
      builtBy: 'Açık kaynak topluluğu tarafından inşa edildi',
      docs: 'Belgeler',
      github: 'GitHub',
      license: 'MIT Lisansı'
    },
    platform: {
      comingSoon: 'Yakında',
      macOnly: 'Şu anda yalnızca macOS için mevcut.',
      windowsLinuxSoon: 'Şu anda yalnızca macOS için mevcut. Windows ve Linux desteği yakında.',
      iosSoon: 'Şu anda yalnızca macOS için mevcut. iOS desteği yakında.'
    }
  }
};

// Language configuration
const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'pt-PT', 'es', 'fr', 'de', 'it', 'ru', 'tr'];
const DEFAULT_LANGUAGE = 'en';
let currentLanguage = DEFAULT_LANGUAGE;

// Language code mapping (for browser language detection)
const LANGUAGE_MAPPING = {
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'pt': 'pt-BR',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'fr': 'fr',
  'fr-FR': 'fr',
  'de': 'de',
  'de-DE': 'de',
  'it': 'it',
  'it-IT': 'it',
  'ru': 'ru',
  'ru-RU': 'ru',
  'tr': 'tr',
  'tr-TR': 'tr'
};

// Detect user's preferred language from browser
function detectLanguage() {
  // 1. Check localStorage for saved preference
  const savedLang = localStorage.getItem('vox-language');
  if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
    return savedLang;
  }

  // 2. Check navigator.languages (array of preferred languages)
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const mappedLang = LANGUAGE_MAPPING[lang] || LANGUAGE_MAPPING[lang.split('-')[0]];
      if (mappedLang && SUPPORTED_LANGUAGES.includes(mappedLang)) {
        return mappedLang;
      }
    }
  }

  // 3. Check navigator.language (single preferred language)
  if (navigator.language) {
    const mappedLang = LANGUAGE_MAPPING[navigator.language] || LANGUAGE_MAPPING[navigator.language.split('-')[0]];
    if (mappedLang && SUPPORTED_LANGUAGES.includes(mappedLang)) {
      return mappedLang;
    }
  }

  // 4. Fallback to English
  return DEFAULT_LANGUAGE;
}

// Get translation string by key path (supports dot notation)
function t(keyPath) {
  const keys = keyPath.split('.');
  let value = translations[currentLanguage];

  // Navigate through nested keys
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English if key not found
      value = translations[DEFAULT_LANGUAGE];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          console.warn(`Translation key not found: ${keyPath}`);
          return keyPath;
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : keyPath;
}

// Update meta tags with translated content
function updateMetaTags(lang) {
  // Update HTML lang attribute
  document.documentElement.setAttribute('lang', lang === 'pt-BR' ? 'pt' : lang === 'pt-PT' ? 'pt' : lang);

  // Update title
  document.title = t('meta.title');

  // Update meta tags
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.setAttribute('content', t('meta.description'));

  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) metaKeywords.setAttribute('content', t('meta.keywords'));

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', t('meta.ogTitle'));

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute('content', t('meta.ogDescription'));

  const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
  if (ogImageAlt) ogImageAlt.setAttribute('content', t('meta.ogImageAlt'));

  // Update Twitter Card tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', t('meta.twitterTitle'));

  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterDescription) twitterDescription.setAttribute('content', t('meta.twitterDescription'));

  const twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]');
  if (twitterImageAlt) twitterImageAlt.setAttribute('content', t('meta.ogImageAlt'));
}

// Update all translatable elements in DOM
function updatePageTranslations() {
  // Query all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');

  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);

    // Check if element has data-i18n-attr (for attributes like placeholder, aria-label)
    const attr = element.getAttribute('data-i18n-attr');
    if (attr) {
      element.setAttribute(attr, translation);
    } else {
      // Update text content
      element.textContent = translation;
    }
  });

  // Update meta tags
  updateMetaTags(currentLanguage);
}

// Set active language
function setLanguage(langCode) {
  if (!SUPPORTED_LANGUAGES.includes(langCode)) {
    console.warn(`Language not supported: ${langCode}, falling back to ${DEFAULT_LANGUAGE}`);
    langCode = DEFAULT_LANGUAGE;
  }

  currentLanguage = langCode;

  // Save to localStorage
  localStorage.setItem('vox-language', langCode);

  // Update DOM
  updatePageTranslations();

  // Update language switcher UI
  updateLanguageSwitcherUI(langCode);
}

// Update language switcher UI to show current language
function updateLanguageSwitcherUI(langCode) {
  const currentLangDisplay = document.getElementById('current-language');
  if (currentLangDisplay) {
    // Map language codes to display names
    const displayNames = {
      'en': 'EN',
      'pt-BR': 'PT',
      'pt-PT': 'PT',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'ru': 'RU',
      'tr': 'TR'
    };
    currentLangDisplay.textContent = displayNames[langCode] || 'EN';
  }

  // Update active state in menu
  const menuButtons = document.querySelectorAll('.language-menu button');
  menuButtons.forEach(button => {
    if (button.getAttribute('data-lang') === langCode) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Get current language (for use in script.js)
function getCurrentLanguage() {
  return currentLanguage;
}

// Export functions for use in script.js
window.i18n = {
  detectLanguage,
  setLanguage,
  t,
  getCurrentLanguage,
  updatePageTranslations
};
