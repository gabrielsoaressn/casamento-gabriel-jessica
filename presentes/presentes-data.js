// ──────────────────────────────────────────────────────────────────
// Lista de presentes — fonte única de verdade
//
// Os cards da página /presentes são montados a partir daqui (a montagem
// fica em script.js, em renderizarPresentes). Para acrescentar, tirar ou
// corrigir um presente, mexa só neste arquivo.
//
// id      O backend grava este valor em presentes_reservados.presente_id,
//         que é uma coluna UNIQUE: assim que alguém gera o pagamento, o
//         presente sai da lista para os outros convidados. Por isso o id
//         de um presente já publicado NUNCA deve mudar — se mudar, a
//         reserva antiga deixa de casar com o card e o presente reaparece
//         como disponível.
// valor   Em reais. null = item sem preço fechado (veio da lista de
//         desejos do documento): o convidado escolhe quanto contribuir,
//         respeitando o mínimo de R$ 10 que o backend exige.
// imagem  Arquivo em /images/presentes. Sem imagem, o card cai no ícone.
//
// Os preços vieram de "Lista de presentes de casamento.docx"; as fotos
// saíram do mesmo documento (convertidas para JPEG em images/presentes).
// ──────────────────────────────────────────────────────────────────

const CATEGORIAS_PRESENTES = [
    {
        id: 'cozinha',
        nome: 'Cozinha',
        descricao: 'O coração da nossa casa',
        icone: `<path d="M4 10h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path>
                <path d="M20 11.6h2.1a1.2 1.2 0 0 1 0 2.4H20"></path>
                <path d="M4 11.6H1.9a1.2 1.2 0 0 0 0 2.4H4"></path>
                <path d="M9 7.6V6M12 7.6V4.8M15 7.6V6"></path>`
    },
    {
        id: 'quarto',
        nome: 'Quarto',
        descricao: 'Para as noites e os domingos',
        icone: `<path d="M2 20v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"></path>
                <path d="M2 16h20"></path>
                <path d="M6 12V9.5A1.5 1.5 0 0 1 7.5 8h9A1.5 1.5 0 0 1 18 9.5V12"></path>`
    },
    {
        id: 'banheiro',
        nome: 'Banheiro',
        descricao: 'Maciez no começo do dia',
        icone: `<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"></path>
                <path d="M6 12V6a2 2 0 0 1 4 0"></path>
                <path d="M6.5 19.5 5 22M17.5 19.5 19 22"></path>`
    },
    {
        id: 'casa',
        nome: 'Casa e Limpeza',
        descricao: 'Para manter tudo em ordem',
        icone: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>`
    },
    {
        id: 'escritorio',
        nome: 'Sala e Escritório',
        descricao: 'Nosso cantinho de trabalho e descanso',
        icone: `<rect x="2.5" y="4" width="19" height="12" rx="1.5"></rect>
                <path d="M8 20h8M12 16v4"></path>`
    }
];

const PRESENTES = [
    // ---------- Cozinha ----------
    {
        id: 'jogo-panelas-inox-7pcs',
        nome: 'Jogo de Panelas Inox 7 Peças',
        descricao: 'Para os primeiros jantares em casa',
        valor: 571.87,
        imagem: 'jogo-panelas-inox-7pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-2-frigideiras-ceramica',
        nome: 'Kit 2 Frigideiras de Cerâmica',
        descricao: 'Para as manhãs de ovos mexidos',
        valor: 164.87,
        imagem: 'kit-2-frigideiras-ceramica.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'panela-pressao-tramontina',
        nome: 'Panela de Pressão Tramontina',
        descricao: 'Para o feijão de todo domingo',
        valor: 273.10,
        imagem: 'panela-pressao-tramontina.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'conjunto-2-assadeiras-marinex',
        nome: 'Duo de Travessas Marinex',
        descricao: 'Para os assados de fim de semana',
        valor: 62.91,
        imagem: 'conjunto-2-assadeiras-marinex.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'conjunto-assadeiras-6pcs-marinex',
        nome: 'Assadeiras Marinex 6 Peças',
        descricao: 'Para guardar e servir com carinho',
        valor: 134.96,
        imagem: 'conjunto-assadeiras-6pcs-marinex.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-6-potes-vidro-hermetico',
        nome: 'Kit 6 Potes de Vidro',
        descricao: 'Para guardar as sobras do jantar',
        valor: 59.70,
        imagem: 'kit-6-potes-vidro-hermetico.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-12-potes-plasticos',
        nome: 'Kit 12 Potes Herméticos',
        descricao: 'Para organizar a nossa despensa',
        valor: 49.95,
        imagem: 'kit-12-potes-plasticos.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'tabua-carne-madeira',
        nome: 'Tábua de Carne Artesanal',
        descricao: 'Para os churrascos de domingo',
        valor: 175.23,
        imagem: 'tabua-carne-madeira.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'tabua-corte-inox',
        nome: 'Tábua de Corte Inox',
        descricao: 'Para o preparo de cada refeição',
        valor: 35.28,
        imagem: 'tabua-corte-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-5-facas-inox',
        nome: 'Jogo de 5 Facas Inox',
        descricao: 'Para cozinhar juntos todos os dias',
        valor: 165.12,
        imagem: 'jogo-5-facas-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-espatulas-silicone',
        nome: 'Kit de Espátulas de Silicone',
        descricao: 'Para raspar até a última colherada',
        valor: 39.45,
        imagem: 'kit-espatulas-silicone.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-pegadores-cozinha',
        nome: 'Kit de Pegadores em Inox',
        descricao: 'Para servir com capricho à mesa',
        valor: 34.90,
        imagem: 'kit-pegadores-cozinha.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'liquidificador-britania',
        nome: 'Liquidificador Britânia 1400W',
        descricao: 'Para as vitaminas de cada manhã',
        valor: 267.07,
        imagem: 'liquidificador-britania.jpg',
        categoria: 'cozinha'
    },
    {
        // Card antigo: o id continua 'sanduicheira' para não perder reserva
        // já feita. Nome, preço e foto passaram a ser os do documento.
        id: 'sanduicheira',
        nome: 'Sanduicheira Master Grill',
        descricao: 'Para os lanches de fim de tarde',
        valor: 92.30,
        imagem: 'sanduicheira-mondial.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'air-fryer-mondial-12l',
        nome: 'Air Fryer Forno Mondial 12L',
        descricao: 'Para assar juntos nos dias de folga',
        valor: 549.90,
        imagem: 'air-fryer-mondial-12l.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'cafeteira-black-decker',
        nome: 'Cafeteira Black+Decker',
        descricao: 'Para as nossas manhãs de café',
        valor: 342.53,
        imagem: 'cafeteira-black-decker.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'mixer-3em1-inox',
        nome: 'Mixer 3 em 1 Inox',
        descricao: 'Para as receitas a quatro mãos',
        valor: 158.11,
        imagem: 'mixer-3em1-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'chaleira',
        nome: 'Chaleira',
        descricao: 'Para nossos momentos de chá e café',
        valor: 50.00,
        imagem: 'chaleira.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'aparelho-jantar-cha-20pcs',
        nome: 'Aparelho de Jantar e Chá',
        descricao: '20 peças, para os almoços de domingo',
        valor: 269.80,
        imagem: 'aparelho-jantar-cha-20pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'aparelho-jantar-30pcs-alleanza',
        nome: 'Aparelho de Jantar Branco',
        descricao: '30 peças, para os jantares a dois',
        valor: 449.80,
        imagem: 'aparelho-jantar-30pcs-alleanza.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'faqueiro-brinox-42pcs',
        nome: 'Faqueiro Turim 42 Peças',
        descricao: 'Para a mesa posta com todo carinho',
        valor: 129.09,
        imagem: 'faqueiro-brinox-42pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-jarra-6-copos-madri',
        nome: 'Jarra e 6 Copos Madri',
        descricao: 'Para os brindes de fim de tarde',
        valor: 76.52,
        imagem: 'jogo-jarra-6-copos-madri.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'garrafa-termica-1l',
        nome: 'Garrafa Térmica com Madeira',
        descricao: 'Para as manhãs de café na cama',
        valor: 59.62,
        imagem: 'garrafa-termica-1l.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-tacas',
        nome: 'Jogo de Taças',
        descricao: 'Para os brindes que ainda virão',
        valor: null,
        categoria: 'cozinha'
    },
    {
        id: 'jogo-sobremesa',
        nome: 'Jogo de Sobremesa',
        descricao: 'Para adoçar o fim das refeições',
        valor: null,
        categoria: 'cozinha'
    },

    // ---------- Quarto ----------
    {
        id: 'jogo-cama-queen-branco',
        nome: 'Jogo de Cama Queen Branco',
        descricao: '300 fios, para noites tranquilas',
        valor: 714.90,
        imagem: 'jogo-cama-queen-branco.jpg',
        categoria: 'quarto'
    },
    {
        id: 'jogo-cama-queen-bossa',
        nome: 'Jogo de Cama Bossa Queen',
        descricao: '300 fios, para acordar pertinho',
        valor: 664.90,
        imagem: 'jogo-cama-queen-bossa.jpg',
        categoria: 'quarto'
    },
    {
        id: 'edredom-queen-iasmin',
        nome: 'Edredom Queen Iasmin',
        descricao: 'Para os domingos preguiçosos a dois',
        valor: 539.90,
        imagem: 'edredom-queen-iasmin.jpg',
        categoria: 'quarto'
    },
    {
        id: 'ar-condicionado',
        nome: 'Ar-Condicionado',
        descricao: 'Para dias frescos em nossa casa',
        valor: 1500.00,
        imagem: 'ar-condicionado.jpg',
        categoria: 'quarto'
    },

    // ---------- Banheiro ----------
    {
        id: 'jogo-banho-buddemeyer',
        nome: 'Jogo de Banho Buddemeyer',
        descricao: 'Para envolver as manhãs em maciez',
        valor: 269.90,
        imagem: 'jogo-banho-buddemeyer.jpg',
        categoria: 'banheiro'
    },
    {
        // O documento traz o preço, mas não trouxe foto — o card usa o ícone.
        id: 'lixeira-inox-banheiro',
        nome: 'Lixeira Inox 5L com Pedal',
        descricao: 'Para o cantinho sempre em ordem',
        valor: 69.90,
        categoria: 'banheiro'
    },

    // ---------- Casa e Limpeza ----------
    {
        id: 'robo-limpeza',
        nome: 'Robô de Limpeza',
        descricao: 'Para manter nossa casa sempre limpa',
        valor: 700.00,
        imagem: 'robo-limpeza.jpg',
        categoria: 'casa'
    },
    {
        id: 'lava-seca',
        nome: 'Lava e Seca',
        descricao: 'Praticidade para nosso dia a dia',
        valor: 1320.00,
        imagem: 'lava-seca.jpg',
        categoria: 'casa'
    },
    {
        id: 'cesto-roupa-suja',
        nome: 'Cesto de Roupa Suja',
        descricao: 'Para organizar nossa lavanderia',
        valor: 120.00,
        imagem: 'cesto-roupa-suja.jpg',
        categoria: 'casa'
    },
    {
        id: 'ferro-passar',
        nome: 'Ferro de Passar',
        descricao: 'Para as roupas sempre no capricho',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'tabua-passar-roupa',
        nome: 'Tábua de Passar Roupa',
        descricao: 'Companheira do ferro de passar',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'varal',
        nome: 'Varal',
        descricao: 'Para as peças mais delicadas',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'jogo-panos-prato',
        nome: 'Jogo de Panos de Prato',
        descricao: 'Para secar a louça do jantar',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'panos-limpeza',
        nome: 'Panos de Limpeza',
        descricao: 'Do básico que nunca pode faltar',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'tapetes',
        nome: 'Tapetes',
        descricao: 'Para deixar a casa mais aconchegante',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'cesto-organizador',
        nome: 'Cesto Organizador',
        descricao: 'Um lugar para cada coisa',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'organizador-gavetas',
        nome: 'Organizador de Gavetas',
        descricao: 'Para as gavetas em ordem',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'vassoura',
        nome: 'Vassoura',
        descricao: 'Do básico que nunca pode faltar',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'rodo',
        nome: 'Rodo',
        descricao: 'Companheiro da faxina de sábado',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'pa',
        nome: 'Pá',
        descricao: 'Do básico que nunca pode faltar',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'balde',
        nome: 'Balde',
        descricao: 'Companheiro da faxina de sábado',
        valor: null,
        categoria: 'casa'
    },
    {
        id: 'mop',
        nome: 'Mop',
        descricao: 'Para o chão brilhando sem esforço',
        valor: null,
        categoria: 'casa'
    },

    // ---------- Sala e Escritório ----------
    {
        id: 'projetor-4k',
        nome: 'Projetor 4K',
        descricao: 'Para nossas noites de cinema em casa',
        valor: 176.00,
        imagem: 'projetor-4k.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'caixa-som-portatil',
        nome: 'Caixa de Som Portátil',
        descricao: 'Para animar nossos momentos',
        valor: 120.00,
        imagem: 'caixa-som-portatil.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'escrivaninha',
        nome: 'Escrivaninha',
        descricao: 'Para nosso cantinho de trabalho',
        valor: 270.00,
        imagem: 'escrivaninha.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'cadeira-escritorio',
        nome: 'Cadeira de Escritório',
        descricao: 'Conforto para os momentos de estudo',
        valor: 359.00,
        imagem: 'cadeira-escritorio.jpg',
        categoria: 'escritorio'
    }
];
