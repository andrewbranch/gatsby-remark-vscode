// @ts-check
const parse = require('../src/parseCodeFenceHeader');

describe('parseCodeFenceHeader', () => {
  it('parses language name without options', () => {
    expect(parse('jsx')).toEqual({ languageName: 'jsx', options: {} });
    expect(parse('c++')).toEqual({ languageName: 'c++', options: {} });
  });

  it('parses empty options', () => {
    expect(parse('jsx{}')).toEqual({ languageName: 'jsx', options: {} });
  });

  it('ignores space between language name and options', () => {
    expect(parse('jsx     {}')).toEqual({ languageName: 'jsx', options: {} });
  });

  it('ignores space within options object', () => {
    expect(parse('jsx{    }')).toEqual({ languageName: 'jsx', options: {} });
  });

  it('parses gatsby-remark-prismjs line highlighting syntax', () => {
    expect(parse('jsx{1,4-6}')).toEqual({ languageName: 'jsx', options: { 1: true, '4-6': true } });
  });

  it('ignores space between object keys', () => {
    expect(parse('jsx{1,    4-6}')).toEqual({ languageName: 'jsx', options: { 1: true, '4-6': true } });
  });

  it('parses objects with number values', () => {
    expect(parse('jsx{a: 24e3, b: .9, c: -4.2}'))
      .toEqual({ languageName: 'jsx', options: { a: 24e3, b: 0.9, c: -4.2 } });
  });

  it('parses objects with string values', () => {
    expect(parse(`jsx{a: "b", c: 'd'}`)).toEqual({ languageName: 'jsx', options: { a: 'b', c: 'd' } });
  });

  it('parses objects with boolean values', () => {
    expect(parse('jsx{a: true, b: false}')).toEqual({ languageName: 'jsx', options: { a: true, b: false } });
  });

  it('parses nested objects', () => {
    expect(parse('jsx{ a: { 1 } }')).toEqual({ languageName: 'jsx', options: { a: { 1: true } } });
  });

  it('parses strings with escape characters', () => {
    expect(parse(`jsx{a: '\\''}`)).toEqual({ languageName: 'jsx', options: { a: `'` } });
  });

  it('gives good error messages', () => {
    expect(() => parse('jsx{ a: }')).toThrowError(/expected expression/i);
    expect(() => parse('jsx{ a: boo }')).toThrowError(/unrecognized input 'boo'/i);
    expect(() => parse('jsx{ : }')).toThrowError(/expected identifier/i);
    expect(() => parse('jsx{ a: "')).toThrowError(/unexpected end of input/i);
    expect(() => parse('c%')).toThrowError(/invalid character in language name.+?%/i);
    expect(() => parse('c %')).toThrowError(/unrecognized input.+?%/i);
  });
});
