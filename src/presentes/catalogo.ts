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
  cotas?: number;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PRESENTES } = require(
  join(__dirname, '..', '..', 'presentes', 'presentes-data.js'),
) as { PRESENTES: PresenteCatalogo[] };

export function buscarPresente(id: string): PresenteCatalogo | undefined {
  return PRESENTES.find((presente) => presente.id === id);
}

// Presente dividido em cotas: cada cota é reservada à parte, com este id.
// O front (script.js) monta o mesmo id para contar as cotas que restam.
export function idsDasCotas(presente: PresenteCatalogo): string[] {
  return Array.from(
    { length: presente.cotas ?? 0 },
    (_, i) => `${presente.id}-cota-${i + 1}`,
  );
}

// Arredonda para centavos: o Mercado Pago recebe o valor com duas casas.
export function valorDaCota(presente: PresenteCatalogo): number {
  return Math.round((presente.valor * 100) / presente.cotas) / 100;
}
