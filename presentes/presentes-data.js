// ──────────────────────────────────────────────────────────────────
// Lista de presentes — fonte única de verdade
//
// Os cards da página /presentes são montados a partir daqui (a montagem
// fica em script.js, em renderizarPresentes), e o backend lê este mesmo
// arquivo para saber o preço de cada presente (src/presentes/catalogo.ts).
// Para acrescentar, tirar ou corrigir um presente, mexa só neste arquivo —
// e lembre de atualizar o servidor também, senão ele cobra o preço antigo.
//
// A ordem de CATEGORIAS_PRESENTES é a ordem das seções na página.
//
// id      O backend grava este valor em presentes_reservados.presente_id,
//         que é uma coluna UNIQUE: assim que alguém gera o pagamento, o
//         presente sai da lista para os outros convidados. Por isso o id
//         de um presente já publicado NUNCA deve mudar — se mudar, a
//         reserva antiga deixa de casar com o card e o presente reaparece
//         como disponível.
// nome    Nome completo do produto, com marca, tamanho e quantidade, para
//         o convidado conseguir achar o mesmo item numa loja.
// valor   Em reais. É este valor que vai para o Mercado Pago: o backend
//         ignora o que o navegador mandar. null = valor livre: o convidado
//         escolhe quanto contribuir (mínimo de R$ 10). Hoje nenhum item usa,
//         mas o checkout e o backend continuam aceitando.
// imagem  Arquivo em /images/presentes. Sem imagem, o card cai no ícone.
// cotas   Opcional. Divide um presente caro em partes iguais: o card mostra
//         o valor de uma cota (valor / cotas) e quantas ainda restam, e cada
//         convidado compra uma. No banco cada cota é uma reserva à parte,
//         com o id "<id>-cota-<n>" (n de 1 a cotas).
//
// Os preços vieram de "Lista de presentes de casamento.docx"; as fotos
// saíram do mesmo documento (convertidas para JPEG em images/presentes).
// ──────────────────────────────────────────────────────────────────

const CATEGORIAS_PRESENTES = [
    {
        id: 'cozinha',
        nome: 'Cozinha',
        icone: `<path d="M4 10h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path>
                <path d="M20 11.6h2.1a1.2 1.2 0 0 1 0 2.4H20"></path>
                <path d="M4 11.6H1.9a1.2 1.2 0 0 0 0 2.4H4"></path>
                <path d="M9 7.6V6M12 7.6V4.8M15 7.6V6"></path>`
    },
    {
        id: 'quarto',
        nome: 'Quarto',
        icone: `<path d="M2 20v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"></path>
                <path d="M2 16h20"></path>
                <path d="M6 12V9.5A1.5 1.5 0 0 1 7.5 8h9A1.5 1.5 0 0 1 18 9.5V12"></path>`
    },
    {
        id: 'banheiro',
        nome: 'Banheiro',
        icone: `<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"></path>
                <path d="M6 12V6a2 2 0 0 1 4 0"></path>
                <path d="M6.5 19.5 5 22M17.5 19.5 19 22"></path>`
    },
    {
        id: 'casa',
        nome: 'Casa',
        icone: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>`
    },
    {
        id: 'escritorio',
        nome: 'Sala e Escritório',
        icone: `<rect x="2.5" y="4" width="19" height="12" rx="1.5"></rect>
                <path d="M8 20h8M12 16v4"></path>`
    }
];

const PRESENTES = [
    // ---------- Cozinha ----------
    {
        id: 'jogo-panelas-inox-7pcs',
        nome: 'Jogo de Panelas Inox Fundo Triplo 7 Peças',
        valor: 571.87,
        imagem: 'jogo-panelas-inox-7pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-2-frigideiras-ceramica',
        nome: 'Kit 2 Frigideiras Antiaderentes Cerâmica 24 cm Fogão Indução',
        valor: 164.87,
        imagem: 'kit-2-frigideiras-ceramica.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'panela-pressao-tramontina',
        nome: 'Panela de Pressão Arizona Indução 20 cm 4,5 L Inox Tramontina',
        valor: 273.10,
        imagem: 'panela-pressao-tramontina.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'conjunto-2-assadeiras-marinex',
        nome: 'Conjunto 2 Assadeiras Travessas Vidro Marinex Oval',
        valor: 62.91,
        imagem: 'conjunto-2-assadeiras-marinex.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'conjunto-assadeiras-6pcs-marinex',
        nome: 'Conjunto Assadeiras 6 Peças de Vidro com Tampa Verde Marinex',
        valor: 134.96,
        imagem: 'conjunto-assadeiras-6pcs-marinex.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-6-potes-vidro-hermetico',
        nome: 'Kit 6 Potes 640 ml Vidro Hermético 4 Travas Marmita Refratário Star House',
        valor: 59.70,
        imagem: 'kit-6-potes-vidro-hermetico.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-12-potes-plasticos',
        nome: 'Kit 12 Potes Plásticos 750 ml para Alimentos Hermético Freezer Micro-ondas Marmita Sem BPA com Tampa e Travas',
        valor: 49.95,
        imagem: 'kit-12-potes-plasticos.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'tabua-carne-madeira',
        nome: 'Tábua de Carne Madeira Maciça Invertida Churrasco Artesanal',
        valor: 175.23,
        imagem: 'tabua-carne-madeira.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'tabua-corte-inox',
        nome: 'Tábua de Corte Dupla Face Aço Inox 304 Livre de BPA',
        valor: 35.28,
        imagem: 'tabua-corte-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-5-facas-inox',
        nome: 'Jogo 5 Facas Grandes de Cozinha Aço Inoxidável Prateado',
        valor: 165.12,
        imagem: 'jogo-5-facas-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-espatulas-silicone',
        nome: 'Kit Espátula de Silicone Pão-Duro para Confeitaria e Culinária - 4 Peças Pretas',
        valor: 39.45,
        imagem: 'kit-espatulas-silicone.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'kit-pegadores-cozinha',
        nome: 'Kit Cozinha Pegador Universal Massa, Salada, Gelo e Frios',
        valor: 34.90,
        imagem: 'kit-pegadores-cozinha.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'liquidificador-britania',
        nome: 'Liquidificador Britânia BLQ14A 1400W 2,3 L com Jarra de Vidro e 12 Velocidades',
        valor: 267.07,
        imagem: 'liquidificador-britania.jpg',
        categoria: 'cozinha'
    },
    {
        // Card antigo: o id continua 'sanduicheira' para não perder reserva
        // já feita. Nome, preço e foto passaram a ser os do documento.
        id: 'sanduicheira',
        nome: 'Sanduicheira Master Grill 750W S-20 Mondial',
        valor: 92.30,
        imagem: 'sanduicheira-mondial.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'air-fryer-mondial-12l',
        nome: 'Fritadeira Air Fryer Forno Oven 12 L Mondial 2000W - AFON-12L-BI',
        valor: 549.90,
        imagem: 'air-fryer-mondial-12l.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'cafeteira-black-decker',
        nome: 'Cafeteira Elétrica Inox Black+Decker CM350G 1,5 L',
        valor: 342.53,
        imagem: 'cafeteira-black-decker.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'mixer-3em1-inox',
        nome: 'Mixer de Mão Portátil 3 em 1 Inox 800W Kookin KNHB1008, 8 Velocidades, Função Turbo, Lâminas em Aço Inox 304',
        valor: 158.11,
        imagem: 'mixer-3em1-inox.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'chaleira',
        nome: 'Chaleira',
        valor: 50.00,
        imagem: 'chaleira.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'aparelho-jantar-cha-20pcs',
        nome: 'Aparelho de Jantar e Chá 20 Peças Donna Colb',
        valor: 269.80,
        imagem: 'aparelho-jantar-cha-20pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'aparelho-jantar-30pcs-alleanza',
        nome: 'Aparelho de Jantar 30 Peças Split White Alleanza Cerâmica Branco',
        valor: 449.80,
        imagem: 'aparelho-jantar-30pcs-alleanza.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'faqueiro-brinox-42pcs',
        nome: 'Faqueiro Aço Inox Polido Turim 6 Pessoas 42 Peças Brinox',
        valor: 129.09,
        imagem: 'faqueiro-brinox-42pcs.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-jarra-6-copos-madri',
        nome: 'Jogo Jarra 1,15 L e 6 Copos 300 ml Vidro Madri Luxo Transparente',
        valor: 76.52,
        imagem: 'jogo-jarra-6-copos-madri.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'garrafa-termica-1l',
        nome: 'Garrafa Térmica 1 L Café e Chá, Alça de Madeira, Tampa com Botão de Pressão',
        valor: 59.62,
        imagem: 'garrafa-termica-1l.jpg',
        categoria: 'cozinha'
    },
    {
        id: 'jogo-tacas',
        nome: '6 Taças de Cristal para Vinho Tinto e Branco 460 ml Linha Xtra Titanio Incolor',
        valor: 135.20,
        imagem: 'tacas-cristal-xtra-460ml.jpg',
        categoria: 'cozinha'
    },
    {
        // Os noivos querem ganhar dois jogos destas taças. Cada id só é
        // reservado uma vez, então o segundo jogo é outra entrada.
        id: 'jogo-tacas-2',
        nome: '6 Taças de Cristal para Vinho Tinto e Branco 460 ml Linha Xtra Titanio Incolor',
        valor: 135.20,
        imagem: 'tacas-cristal-xtra-460ml.jpg',
        categoria: 'cozinha'
    },

    // ---------- Quarto ----------
    {
        id: 'jogo-cama-queen-branco',
        nome: 'Jogo de Cama Queen 300 Fios 100% Algodão Branco',
        valor: 714.90,
        imagem: 'jogo-cama-queen-branco.jpg',
        categoria: 'quarto'
    },
    {
        id: 'jogo-cama-queen-bossa',
        nome: 'Jogo de Cama Queen 300 Fios 100% Algodão Bossa Branco',
        valor: 664.90,
        imagem: 'jogo-cama-queen-bossa.jpg',
        categoria: 'quarto'
    },
    {
        // Os dois jogos de cama de 200 fios têm o mesmo nome e a mesma foto;
        // o id leva o preço para os dois não colidirem na reserva.
        id: 'jogo-cama-queen-200-fios-buddemeyer-339',
        nome: 'Jogo de Cama Queen 200 Fios 100% Algodão Branco Buddemeyer',
        valor: 339.90,
        imagem: 'jogo-cama-buddemeyer-200-fios.jpg',
        categoria: 'quarto'
    },
    {
        id: 'jogo-cama-queen-200-fios-buddemeyer-329',
        nome: 'Jogo de Cama Queen 200 Fios 100% Algodão Branco Buddemeyer',
        valor: 329.90,
        imagem: 'jogo-cama-buddemeyer-200-fios.jpg',
        categoria: 'quarto'
    },
    {
        id: 'edredom-queen-iasmin',
        nome: 'Edredom Queen 200 Fios 100% Algodão Iasmin',
        valor: 539.90,
        imagem: 'edredom-queen-iasmin.jpg',
        categoria: 'quarto'
    },
    {
        id: 'kit-manta-peseira-tricot-almofadas',
        nome: 'Kit Manta Peseira de Tricot + 2 Capas de Almofada Cama Casal',
        valor: 134.60,
        imagem: 'kit-manta-peseira-tricot.jpg',
        categoria: 'quarto'
    },
    {
        id: 'ar-condicionado',
        nome: 'Ar-condicionado Split 9.000 BTUs Philco Eco Inverter Frio',
        valor: 1819.25,
        cotas: 5,
        imagem: 'ar-condicionado-philco-9000-btus.jpg',
        categoria: 'quarto'
    },

    // ---------- Banheiro ----------
    {
        id: 'jogo-banho-buddemeyer',
        nome: 'Jogo de Banho Gigante Buddemeyer - Toalha Banhão Olimpo Jacquard - 100% Algodão - Kit 4 Peças',
        valor: 269.90,
        imagem: 'jogo-banho-buddemeyer.jpg',
        categoria: 'banheiro'
    },
    {
        id: 'lixeira-inox-banheiro',
        nome: 'Lixeira Inox 5 L com Pedal e Balde Removível',
        valor: 69.90,
        imagem: 'lixeira-inox-5l-pedal.webp',
        categoria: 'banheiro'
    },

    // ---------- Casa ----------
    {
        id: 'robo-limpeza',
        nome: 'Robô Aspirador Xiaomi S40c 5000pa Wifi Passa Pano Automático',
        valor: 1149.00,
        cotas: 5,
        imagem: 'robo-aspirador-xiaomi-s40c.jpg',
        categoria: 'casa'
    },
    {
        id: 'cesto-roupa-suja',
        nome: 'Cesto de Roupa Suja',
        valor: 120.00,
        imagem: 'cesto-roupa-suja.jpg',
        categoria: 'casa'
    },
    {
        id: 'ferro-passar',
        nome: 'Ferro de Passar Seco e Vapor Electrolux Efficient ESI11, Base Antiaderente, Vapor Vertical, 1200W, Cabo 1,35 m',
        valor: 129.90,
        imagem: 'ferro-passar-electrolux-esi11.jpg',
        categoria: 'casa'
    },
    {
        id: 'echo-dot-5-geracao',
        nome: 'Echo Dot 5ª Geração Alto-falante de 1,73" Azul Amazon',
        valor: 399.00,
        imagem: 'echo-dot-5-geracao-azul.webp',
        categoria: 'casa'
    },
    {
        id: 'furadeira-parafusadeira-48v',
        nome: 'Furadeira e Parafusadeira Sem Fio 48V',
        valor: 139.00,
        imagem: 'furadeira-parafusadeira-48v.webp',
        categoria: 'casa'
    },
    {
        id: 'maleta-ferramentas-129-pecas',
        nome: 'Maleta de Ferramentas Kit com 129 Peças',
        valor: 140.45,
        imagem: 'maleta-ferramentas-129-pecas.webp',
        categoria: 'casa'
    },
    {
        id: 'auxiliar-partida-compressor-pneu',
        nome: 'Auxiliar de Partida Bateria Portátil com Compressor de Pneu',
        valor: 167.40,
        imagem: 'auxiliar-partida-compressor-pneu.webp',
        categoria: 'casa'
    },
    {
        id: 'carregador-portatil-20000mah',
        nome: 'Carregador Portátil de 20000mAh',
        valor: 95.00,
        imagem: 'carregador-portatil-20000mah.webp',
        categoria: 'casa'
    },

    // ---------- Sala e Escritório ----------
    {
        id: 'projetor-4k',
        nome: 'Projetor 4K',
        valor: 176.00,
        imagem: 'projetor-4k.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'caixa-som-portatil',
        nome: 'Caixa de Som Portátil',
        valor: 120.00,
        imagem: 'caixa-som-portatil.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'escrivaninha',
        nome: 'Escrivaninha',
        valor: 270.00,
        imagem: 'escrivaninha.jpg',
        categoria: 'escritorio'
    },
    {
        id: 'cadeira-escritorio',
        nome: 'Cadeira de Escritório',
        valor: 359.00,
        imagem: 'cadeira-escritorio.jpg',
        categoria: 'escritorio'
    }
];

// Para o backend (Node) — no navegador `module` não existe e isto é ignorado.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CATEGORIAS_PRESENTES, PRESENTES };
}
