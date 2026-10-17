// RN02 e RN04: o marcador guarda a publicação mais adiante e só anda para a frente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMarcador } from '../js/marcador.js';

function armazenamentoFalso() {
  const dados = new Map();
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
  };
}

test('começa vazio', () => {
  const m = criarMarcador(armazenamentoFalso());
  assert.equal(m.ms(), null);
  assert.equal(m.iso(), null);
});

test('avança para uma publicação mais nova (critério 2)', () => {
  const m = criarMarcador(armazenamentoFalso());
  assert.equal(m.avancar('2026-10-16T10:00:00.000Z'), true);
  assert.equal(m.iso(), '2026-10-16T10:00:00.000Z');
  assert.equal(m.avancar('2026-10-16T11:00:00.000Z'), true);
  assert.equal(m.iso(), '2026-10-16T11:00:00.000Z');
});

test('nunca volta para trás', () => {
  const m = criarMarcador(armazenamentoFalso());
  m.avancar('2026-10-16T11:00:00.000Z');
  assert.equal(m.avancar('2026-10-10T08:00:00.000Z'), false);
  assert.equal(m.avancar('2026-10-16T11:00:00.000Z'), false);
  assert.equal(m.iso(), '2026-10-16T11:00:00.000Z');
});

test('zerar apaga o marcador', () => {
  const m = criarMarcador(armazenamentoFalso());
  m.avancar('2026-10-16T11:00:00.000Z');
  m.zerar();
  assert.equal(m.ms(), null);
});

test('ignora datas inválidas', () => {
  const m = criarMarcador(armazenamentoFalso());
  assert.equal(m.avancar('não é data'), false);
  assert.equal(m.ms(), null);
});

test('funciona sem armazenamento (navegação privada bloqueada)', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  const m = criarMarcador(quebrado);
  assert.equal(m.ms(), null);
  assert.equal(m.avancar('2026-10-16T11:00:00.000Z'), false);
  assert.doesNotThrow(() => m.zerar());
  assert.equal(criarMarcador(null).ms(), null);
});
