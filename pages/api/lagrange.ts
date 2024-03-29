import { NextApiRequest, NextApiResponse } from 'next';
import { DataPoint, DataPointSchema, LagrangePolynomial, LagrangePolynomialSchema } from '../../interfaces';

import * as math from 'mathjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Descobrir a função interpoladora
        if (req.method === 'POST') {
            const bodyDataPoints: unknown[] = JSON.parse(req.body);

            // Conjunto de pontos enviados pelo usuário
            const dataPoints: DataPoint[] = bodyDataPoints.map((dataPoint) => DataPointSchema.parse(dataPoint));

            // Recebe um número "n" e o conjunto de pontos e retorna a função L(n)
            const getLnFunctionAsString = (n: number, dataPoints: DataPoint[]) => {
                // Exclui o ponto "n" e monta L(n) seguindo a regra de denominadores e numeradores
                const datapointsExcludingN = dataPoints.filter((_, i) => i !== n);

                const denominator = datapointsExcludingN.reduce((acc, dataPoint) => {
                    return acc * (dataPoints[n].x - dataPoint.x);
                }, 1);

                const numerator = datapointsExcludingN.reduce((acc, dataPoint) => {
                    return acc + `(x - ${dataPoint.x})`;
                }, '');

                return `${numerator} / ${denominator}`;
            }

            // Monta o polinômio rodando a função getLnFunctionAsString para cada um dos pontos
            const composedPolynomial = dataPoints.reduce((acc, dataPoint, i) => {
                const ln = getLnFunctionAsString(i, dataPoints);

                return `${acc} + ${dataPoint.y} * (${ln})`;
            }, '');

            // Retorna o polinômio simplificado e os pontos enviados
            return res.status(200).json({
                polynomialString: math.simplify(composedPolynomial).toString(),
                dataPoints: dataPoints
            });
        }

        if (req.method === 'GET') {
            // Recebe o polinômio e o valor de x desejado
            const polynomial: LagrangePolynomial = LagrangePolynomialSchema.parse(req.query)

            // Compila o polinômio (de string, vira expressão matemática)
            const compiledPolynomial = math.compile(polynomial.polynomialString);

            const wishedX = polynomial.wishedX;

            // Retorna o x desejado e o valor de y
            return res.status(200).json({
                wishedX,
                wishedY: compiledPolynomial.evaluate({ x: wishedX })
            });
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error });
    }



    return res.status(405).json({ error: 'Method not allowed' });
}