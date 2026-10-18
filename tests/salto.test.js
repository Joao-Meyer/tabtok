// RN11: o ponto do salto de data é lembrado à parte do marcador e só anda para a frente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSalto } from '../js/salto.js';
import { CHAVE_SALTO } from '../js/config.js';

function armazenamentoFalso() {
  const dados = new Map();
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
  };
}

const inicio = Date.parse('2026-07-17T03:00:00Z');
const marcador = Date.parse('2026-10-16T18:00:00Z');

test('começa vazio', () => {
  assert.equal(criarSalto(armazenamentoFalso()).ler(), null);
});

test('comecar guarda o início do salto, ainda sem ponto', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  assert.deepEqual(s.ler(), { inicio, ponto: null });
});

test('avancar só anda para a frente dentro do salto', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  assert.equal(s.avancar('2026-07-20T10:00:00.000Z'), true);
  assert.equal(s.avancar('2026-07-22T10:00:00.000Z'), true);
  assert.equal(s.avancar('2026-07-21T10:00:00.000Z'), false, 'reler algo mais antigo não volta o ponto');
  assert.equal(s.ler().ponto, '2026-07-22T10:00:00.000Z');
  assert.equal(s.ler().inicio, inicio, 'o início do salto não muda');
});

test('avancar sem salto em andamento não cria nada', () => {
  const s = criarSalto(armazenamentoFalso());
  assert.equal(s.avancar('2026-07-20T10:00:00.000Z'), false);
  assert.equal(s.ler(), null);
});

test('um salto novo substitui o anterior e zera o ponto', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  s.avancar('2026-07-22T10:00:00.000Z');
  const outro = Date.parse('2026-09-01T03:00:00Z');
  s.comecar(outro);
  assert.deepEqual(s.ler(), { inicio: outro, ponto: null });
});

test('pendente: só se já houve leitura e o ponto ainda está antes do marcador', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  assert.equal(s.pendente(marcador), null, 'sem leitura no salto, não há o que continuar');
  s.avancar('2026-07-22T10:00:00.000Z');
  assert.equal(s.pendente(marcador).ponto, '2026-07-22T10:00:00.000Z');
  s.avancar('2026-10-16T18:00:00.000Z');
  assert.equal(s.pendente(marcador), null, 'ponto alcançou o marcador: o salto acabou');
});

test('pendente: sem marcador não há o que oferecer', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  s.avancar('2026-07-22T10:00:00.000Z');
  assert.equal(s.pendente(null), null);
});

test('limpar esquece o salto', () => {
  const s = criarSalto(armazenamentoFalso());
  s.comecar(inicio);
  s.limpar();
  assert.equal(s.ler(), null);
});

test('conteúdo guardado inválido é tratado como sem salto', () => {
  const arm = armazenamentoFalso();
  const s = criarSalto(arm);
  for (const ruim of ['não é json', '{"inicio":"x"}', '{}', 'null']) {
    arm.setItem(CHAVE_SALTO, ruim);
    assert.equal(s.ler(), null, ruim);
  }
  arm.setItem(CHAVE_SALTO, JSON.stringify({ inicio, ponto: 'lixo' }));
  assert.deepEqual(s.ler(), { inicio, ponto: null }, 'ponto inválido é ignorado');
});

test('sem armazenamento (navegação privada bloqueada) não quebra', () => {
  const s = criarSalto(null);
  s.comecar(inicio);
  assert.equal(s.avancar('2026-07-20T10:00:00.000Z'), false);
  assert.equal(s.pendente(marcador), null);
  s.limpar();
});
