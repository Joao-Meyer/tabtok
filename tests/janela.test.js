// RN01 e RN05 a RN08: de onde o feed começa e o que entra nele.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularJanela, selecionarItens } from '../js/janela.js';
import { DIA, HORA } from '../js/config.js';

const agora = Date.parse('2026-10-16T21:00:00Z');
const pub = (iso, id = iso) => ({ id, published_at: iso });

test('primeira visita: últimas 24 horas (critério 1)', () => {
  const j = calcularJanela({ agora, marcadorMs: null });
  assert.equal(j.modo, 'primeira');
  assert.equal(j.inicio, agora - 24 * HORA);
  assert.equal(j.haMaisAntigas, false);
});

test('retorno com marcador recente: começa no marcador (critério 3)', () => {
  const marcadorMs = agora - 3 * DIA;
  const j = calcularJanela({ agora, marcadorMs });
  assert.equal(j.modo, 'marcador');
  assert.equal(j.inicio, marcadorMs);
  assert.equal(j.haMaisAntigas, false);
});

test('ausência longa: limita a 7 dias e avisa (critério 4)', () => {
  const marcadorMs = agora - 14 * DIA;
  const j = calcularJanela({ agora, marcadorMs });
  assert.equal(j.inicio, agora - 7 * DIA);
  assert.equal(j.haMaisAntigas, true);
  assert.equal(j.desdeMarcador, marcadorMs);
});

test('ir para uma data: começa naquele dia, incluindo a meia-noite (critério 5)', () => {
  const data = Date.parse('2026-10-11T03:00:00Z');
  const j = calcularJanela({ agora, marcadorMs: agora - DIA, data });
  assert.equal(j.modo, 'data');
  assert.equal(j.inicio, data);
  assert.equal(j.inclusivo, true);
});

test('selecionarItens: só depois do início, do mais antigo para o mais novo', () => {
  const lista = [pub('2026-10-16T15:00:00Z'), pub('2026-10-14T10:00:00Z'), pub('2026-10-16T09:00:00Z'), pub('2026-10-15T12:00:00Z')];
  const inicio = Date.parse('2026-10-15T12:00:00Z');
  const exclusivo = selecionarItens(lista, { inicio, inclusivo: false }).map((p) => p.published_at);
  assert.deepEqual(exclusivo, ['2026-10-16T09:00:00Z', '2026-10-16T15:00:00Z']);
  const inclusivo = selecionarItens(lista, { inicio, inclusivo: true }).map((p) => p.published_at);
  assert.deepEqual(inclusivo, ['2026-10-15T12:00:00Z', '2026-10-16T09:00:00Z', '2026-10-16T15:00:00Z']);
});
