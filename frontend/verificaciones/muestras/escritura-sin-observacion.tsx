import { useMutation } from '@tanstack/react-query';
import { solicitar } from '@sgtm/api-client';

/**
 * Muestra que viola la regla 10 (RNF-052): guardar sin observacion del usuario.
 *
 * El boton escribe en cuanto se pulsa. No hay campo de observacion, asi que la
 * modificacion entra en la base sin que nadie pueda decir despues **por que** se
 * hizo —que es justo lo que el manual exige poder decir de cada cambio—.
 *
 * La regla no comprueba que falte el campo: comprueba que la escritura no pasa
 * por `useEscritura`, que es quien lo pide.
 */
export function AnularRecibo({ numero }: { readonly numero: string }) {
  const anular = useMutation({
    mutationFn: () => solicitar(`/tesoreria/recibos/${numero}/anulacion`, { metodo: 'POST' }),
  });

  return (
    <button type="button" onClick={() => anular.mutate()}>
      Anular recibo
    </button>
  );
}
