import * as assert from 'assert';
import * as vscode from 'vscode';
import * as extension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('PPM parser success', () => {
    const result = extension.parsePPM('P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5');
    assert.strictEqual(result.width, 2);
    assert.strictEqual(result.height, 2);
    assert.deepStrictEqual(result.pixels, new Uint8Array([0, 1, 2, 255, 3, 4, 5, 255, 0, 1, 2, 255, 3, 4, 5, 255]));
  });

  test('PPM parser not enough data', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5';
    for (let i = 0; i < validPPM.length - 1; ++i) {
      const invalidPPM = validPPM.slice(0, i);
      assert.throws(() => extension.parsePPM(invalidPPM), Error);
    }
  });

  test('PPM parser illegal characters', () => {
    const validPPM = 'P3 2 2 255 0 1 2 3 4 5 0 1 2 3 4 5';
    for (let i = 0; i < validPPM.length; ++i) {
      const invalidPPM = validPPM.slice(0, i) + 'a' + validPPM.slice(i);
      assert.throws(() => extension.parsePPM(invalidPPM), Error);
    }
  });
});
