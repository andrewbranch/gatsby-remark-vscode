/**
 * @returns {grvsc.Writer}
 */
function createWriter() {
  let out = '';
  let indent = 0;

  return {
    write,
    writeList,
    writeNewLine,
    increaseIndent,
    decreaseIndent,
    getText,
    noop
  };

  /** @param {string} text */
  function write(text) {
    out += text;
  }
  function writeNewLine() {
    out += `\n${'  '.repeat(indent)}`;
  }
  function increaseIndent() {
    indent++;
  }
  function decreaseIndent() {
    indent--;
  }
  function getText() {
    return out;
  }
  function noop() {
    return;
  }
}

/**
 * @template T
 * @param {T[]} list
 * @param {(element: T) => void} writeElement
 * @param {() => void} writeSeparator
 */
function writeList(list, writeElement, writeSeparator) {
  list.forEach((element, i, { length }) => {
    writeElement(element);
    if (i < length - 1) {
      writeSeparator();
    }
  });
}

module.exports = createWriter;
