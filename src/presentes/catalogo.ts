import { join } from 'path';

// O catálogo é o mesmo arquivo que monta os cards no site
// (presentes/presentes-data.js). Ler daqui garante que o preço cobrado no
// Mercado Pago é o preço exibido — e não o que o navegador mandar, que
// qualquer um pode alterar.
//
// Daqui (dist/presentes) até a raiz do projeto são dois níveis, o mesmo
// caminho que o ServeStaticModule usa para servir o site.
export interface PresenteCatalogo {
  id: string;
  nome: string;
  valor: number | null;
  imagem?: string;
  categoria: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PRESENTES } = require(
  join(__dirname, '..', '..', 'presentes', 'presentes-data.js'),
) as { PRESENTES: PresenteCatalogo[] };

export function buscarPresente(id: string): PresenteCatalogo | undefined {
  return PRESENTES.find((presente) => presente.id === id);
}
