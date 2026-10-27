const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Editor } = require('../src/app/Editor');

class Fixture {
  constructor(t) {
    this.editor = new Editor();
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-editor-'));
    t.after(() => fs.rmSync(this.dir, { recursive: true, force: true }));
    this.run('init');
  }

  run(line) {
    const result = this.editor.handleLine(line);
    assert.ok(result === null || !result.startsWith('error:'), `${line}: ${result}`);
    return result;
  }

  document() {
    // Inspect the actual model and index, not just the abbreviated tree output.
    const doc = this.editor.doc;
    const visited = [];
    const visit = (shape, parent) => {
      assert.equal(shape.parent, parent);
      assert.equal(doc.findById(shape.id), shape);
      assert.ok(!visited.includes(shape.id), `duplicate node: ${shape.id}`);
      visited.push(shape.id);
      if (shape.isGroup()) shape.children.forEach(child => visit(child, shape));
    };
    doc.children.forEach(shape => visit(shape, null));
    assert.equal(doc._shapesById.size, visited.length);
    return { svg: doc.toSvg(), path: doc.filePath, ids: visited };
  }

  state() {
    const history = this.editor.history;
    return {
      doc: this.document(),
      undo: [...history._undoStack],
      redo: [...history._redoStack],
      blocked: history._ioBlocked,
    };
  }

  reject(line, pattern = /^error:/) {
    const before = this.state();
    assert.match(this.editor.handleLine(line), pattern, line);
    assert.deepEqual(this.state(), before, `failed command changed state: ${line}`);
  }

  roundTrip(line) {
    const before = this.document();
    this.run(line);
    const after = this.document();
    for (let i = 0; i < 3; i++) {
      this.run('undo');
      assert.deepEqual(this.document(), before, `${line}: undo`);
      this.run('redo');
      assert.deepEqual(this.document(), after, `${line}: redo`);
    }
  }

  file(name, body) {
    const file = path.join(this.dir, name);
    fs.writeFileSync(file, body, 'utf8');
    return file;
  }
}

test('all edit commands restore geometry, attributes, hierarchy and index', t => {
  const f = new Fixture(t);
  f.run('create g scene');
  f.run('create g node in scene');
  f.run('create rect r 0.1 20 30 40 in node');
  f.run('create text label 1 2 "hello world" in node');
  f.run('create circle c 5 6 2');
  f.run('create ellipse e 1 2 3 4');
  f.run('create line l 0 0 10 10 black');
  for (const line of [
    'create rect extra 1 2 3 4 red in scene',
    'move node 0.2 3', 'scale scene 1.3', 'set label text "new content"',
    'set r fill red', 'set r stroke black', 'set r stroke-width 2',
    'delete node', 'group packed e c', 'addto scene c', 'addto scene c',
    'front label', 'back label', 'front scene', 'back l', 'ungroup node',
  ]) {
    f.roundTrip(line);
    f.run('undo');
  }
});

test('unset style is restored, including inherited group fill', t => {
  const f = new Fixture(t);
  f.run('create g g');
  f.run('set g fill blue');
  f.run('create rect r 1 2 3 4 in g');
  const before = f.document();
  f.run('set r fill red');
  f.run('undo');
  assert.deepEqual(f.document(), before);
  assert.equal(f.editor.doc.findById('r').fill, undefined);
});

for (const line of [
  'init nope 20', 'init 20 Infinity', 'init 0 20',
  'canvas 20 nope', 'canvas -1 20', 'canvas 20 30 extra',
  'create rect bad NaN 0 1 1', 'create circle bad 0 0 -1',
  'create ellipse bad 0 0 1 Infinity', 'create line bad 0 0 1 bad',
  'create text bad 0 nope "x"', 'create g ""',
  'move r Infinity 0', 'move r 0 nope', 'scale r nope', 'scale r 0',
  'set r width -1', 'set r x NaN', 'set r stroke-width Infinity',
  'set r unknown 1', 'create rect r 0 0 1 1',
  'create box b 0 0 1 1 "box"', 'create g g in missing',
  'create g g in r', 'move missing 1 2', 'delete missing',
  'create text bad 0 0 "unclosed', 'create text bad 0 0 "x"tail',
  'create g g in', 'create rect bad 0 0 1 1 in',
  'create g g extra', 'move r 1 2 extra', 'set r fill red extra',
  'tree r extra', 'show r extra', 'help extra', 'undo extra', 'redo extra',
  'read a.svg extra', 'save a.svg extra', 'init 1 2 3',
]) {
  test(`invalid input preserves document and history: ${line}`, t => {
    const f = new Fixture(t);
    f.run('create rect r 1 2 3 4');
    f.run('move r 1 2');
    f.run('undo');
    f.reject(line.replace('a.svg', `"${path.join(f.dir, 'a.svg')}"`));
  });
}

test('numeric overflow rolls back an entire group edit', t => {
  const f = new Fixture(t);
  f.run('create g g');
  f.run('create rect small 1 2 3 4 in g');
  f.run('create rect large 1e308 2 3 4 in g');
  f.reject('scale g 2');
  f.reject('move g 1e308 0');
  f.roundTrip('move small 0.2 0.3');
});

test('self-parenting, descendant parenting and duplicate grouping are rejected', t => {
  const f = new Fixture(t);
  f.run('create g outer');
  f.run('create g inner in outer');
  f.run('create rect r 1 2 3 4 in inner');
  f.reject('addto outer outer');
  f.reject('addto inner outer');
  f.reject('group bad r r');
  f.reject('group bad outer r');
  f.reject('ungroup outer');
});

test('group uses document order, independent of input order and original parents', t => {
  const f = new Fixture(t);
  f.run('create g left');
  f.run('create rect a 0 0 1 1 in left');
  f.run('create rect b 0 0 1 1 in left');
  f.run('create g right');
  f.run('create rect c 0 0 1 1 in right');
  f.roundTrip('group packed c b a');
  assert.deepEqual(f.editor.doc.findById('packed').children.map(s => s.id), ['a', 'b', 'c']);
});

test('quoted in is a value, quoted escapes and Windows paths are preserved', t => {
  const f = new Fixture(t);
  f.run('create g g');
  f.run('create text txt 0 0 "in" in g');
  f.run('create rect r 0 0 1 1 "in"');
  f.run(String.raw`set txt text "a \"quote\" & C:\Users\name"`);
  assert.equal(f.editor.doc.findById('txt').content, String.raw`a "quote" & C:\Users\name`);
  assert.equal(f.run('# comment'), null);
  assert.equal(f.run('   '), null);
  f.reject('read "missing\nfile.svg"', /^error:[^\r\n]*$/);
  f.reject('show "missing\nid"', /^error:[^\r\n]*$/);
});

test('history barriers and display commands follow the specified rules', t => {
  const f = new Fixture(t);
  f.reject('undo', /undo not allowed after io command/);
  f.run('create rect r 0 0 1 1');
  f.run('tree'); f.run('show r'); f.run('help'); f.run('canvas');
  f.run('undo');
  f.run('create circle c 0 0 1');
  f.reject('redo', /nothing to redo/);
  f.run('canvas 400 300');
  f.reject('redo', /undo not allowed after io command/);
  f.run('move c 1 1');
  f.roundTrip('move c 2 2');
});

test('undo and redo before init return no-document error', () => {
  const e = new Editor();
  assert.match(e.handleLine('undo'), /^error: no document/);
  assert.match(e.handleLine('redo'), /^error: no document/);
  assert.match(e.handleLine('help'), /Document commands:/);
});

test('failed save preserves remembered path and undo/redo stacks', t => {
  const f = new Fixture(t);
  const target = path.join(f.dir, 'original.svg');
  f.run('create rect r 0 0 1 1');
  f.run(`save "${target}"`);
  const saved = fs.readFileSync(target, 'utf8');
  f.run('move r 10 0'); f.run('undo');
  f.reject(`save "${path.join(f.dir, 'missing', 'bad.svg')}"`, /cannot write file/);
  assert.equal(fs.readFileSync(target, 'utf8'), saved);
  f.run('redo');
  f.run('save');
  assert.match(fs.readFileSync(target, 'utf8'), /x="10"/);
  f.reject('undo', /undo not allowed after io command/);
});

test('supported SVG attributes and text survive save/read/save', t => {
  const f = new Fixture(t);
  f.run('create g g');
  f.run('set g fill blue');
  for (const line of [
    'create rect r 1 2 3 4 in g', 'create circle c 3 4 5',
    'create ellipse e 1 2 3 4', 'create line l 1 2 3 4 black',
    'create text t 5 6 "A & B < C > D"',
    'set l fill "a&b"', 'set r stroke "a\\"b&c<d"',
    'set c stroke-width 0.5', 'create g "id&<quoted>"',
  ]) f.run(line);
  const target = path.join(f.dir, 'round trip.svg');
  f.run(`save "${target}"`);
  const first = fs.readFileSync(target, 'utf8');
  const before = f.document();
  f.run(`read "${target}"`);
  assert.deepEqual(f.document(), before);
  f.run('save');
  assert.equal(fs.readFileSync(target, 'utf8'), first);
});

for (const [name, content] of [
  ['duplicate ids', '<svg><rect id="r"/><g id="r"/></svg>'],
  ['bad nesting', '<svg><g></svg>'],
  ['unclosed root', '<svg><rect/>'],
  ['multiple roots', '<svg/><svg/>'],
  ['invalid entity', '<svg><text id="t">&bogus;</text></svg>'],
  ['bare ampersand', '<svg><text>A & B</text></svg>'],
  ['bare less-than in attribute', '<svg><rect fill="a<b"/></svg>'],
  ['trailing text', '<svg/>junk'],
  ['invalid character reference', '<svg><text>&#0;</text></svg>'],
  ['duplicate attribute', '<svg width="10" width="20"/>'],
  ['wrong namespace', '<svg xmlns="urn:other"/>'],
  ['undeclared prefix', '<svg><foreign:rect/></svg>'],
  ['empty id', '<svg><rect id=""/></svg>'],
  ['text child element', '<svg><text><tspan>x</tspan></text></svg>'],
  ['too deep', `<svg>${'<g>'.repeat(257)}${'</g>'.repeat(257)}</svg>`],
  ['bad number', '<svg><circle id="c" r="NaN"/></svg>'],
  ['negative width', '<svg width="-1"/>'],
  ['doctype', '<!DOCTYPE svg [<!ENTITY x "value">]><svg/>'],
  ['empty file', ''],
  ['wrong root', '<html/>'],
]) {
  test(`failed read preserves document and history: ${name}`, t => {
    const f = new Fixture(t);
    f.run('create rect original 0 0 1 1');
    f.run('move original 1 0'); f.run('undo');
    f.reject(`read "${f.file('bad.svg', content)}"`);
  });
}

test('auto ids skip multiple existing ids without hanging', t => {
  const f = new Fixture(t);
  const file = f.file('ids.svg', '<svg><rect/><rect id="rect1"/><rect id="rect2"/><rect/></svg>');
  const result = spawnSync(process.execPath, ['-r', 'ts-node/register', '-e',
    `const {Editor}=require('./src/app/Editor'); console.log(new Editor().handleLine(${JSON.stringify(`read "${file}"`)}));`,
  ], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 10000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /assigned id rect3/);
  assert.match(result.stdout, /assigned id rect4/);
});

test('unknown SVG content is reported instead of silently discarded', t => {
  const f = new Fixture(t);
  const result = f.run(`read "${f.file('partial.svg',
    '<svg><path d="M0 0"/><g id="g" transform="translate(2,3)"><rect id="r" style="fill:red"/></g></svg>')}"`);
  assert.match(result, /warning:.*path/);
  assert.match(result, /warning:.*transform/);
  assert.match(result, /warning:.*style/);
  f.document();
});

test('REPL continues after errors and prints prompts', () => {
  const result = spawnSync(process.execPath, ['-r', 'ts-node/register', 'src/index.ts'], {
    cwd: path.resolve(__dirname, '..'),
    input: 'init\ncreate text bad 0 0 "unclosed\ncreate rect r 1 2 3 4\nscale r nope\nshow r\n',
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /svg>/);
  assert.match(result.stdout, /error:/);
  assert.match(result.stdout, /x=1 y=2 width=3 height=4/);
  assert.equal(result.stderr, '');
});

test('optional canvas height and numeric zero geometry remain supported', t => {
  const f = new Fixture(t);
  f.run('canvas 400');
  assert.equal(f.run('canvas'), 'canvas 400x600');
  f.run('init 200');
  assert.equal(f.run('canvas'), 'canvas 200x600');
  f.run('create rect r -1.5 +2e1 0 0');
  f.roundTrip('set r stroke-width 0');
  f.roundTrip('move r 0 0');
});

test('same-parent addto restores the original sibling position', t => {
  const f = new Fixture(t);
  f.run('create g g');
  f.run('create rect a 0 0 1 1 in g');
  f.run('create rect b 0 0 1 1 in g');
  f.roundTrip('addto g a');
  assert.deepEqual(f.editor.doc.findById('g').children.map(s => s.id), ['b', 'a']);
});

test('XML whitespace and empty text/style values survive round trips', t => {
  const f = new Fixture(t);
  f.run('create text t 0 0 ""');
  f.run('set t fill ""');
  f.run('set t text "first\r\nsecond\tline"');
  const file = path.join(f.dir, 'text.svg');
  f.run(`save "${file}"`);
  const before = f.document();
  f.run(`read "${file}"`);
  assert.deepEqual(f.document(), before);
  f.reject('set t text "\u0000"');
});

test('auto id counters reset on each import and explicit ids are case sensitive', t => {
  const f = new Fixture(t);
  const file = f.file('repeat.svg', '<svg><rect/><rect id="R"/><rect id="r"/></svg>');
  const first = f.run(`read "${file}"`);
  assert.match(first, /assigned id rect1/);
  assert.equal(f.run(`read "${file}"`), first);
  assert.deepEqual(f.document().ids, ['rect1', 'R', 'r']);
});

test('SVG namespace prefixes work and unsupported attributes are reported', t => {
  const f = new Fixture(t);
  const file = f.file('namespaces.svg',
    '<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="10 10 100 100"><s:rect id="r" data-kind="box"/></s:svg>');
  const result = f.run(`read "${file}"`);
  assert.match(result, /warning:.*viewBox/);
  assert.match(result, /warning:.*data-kind/);
  assert.deepEqual(f.document().ids, ['r']);
});

for (const method of ['writeFileSync', 'renameSync']) {
  test(`failed ${method} leaves existing file and editor state intact`, t => {
    const f = new Fixture(t);
    f.run('create rect r 0 0 1 1');
    const file = path.join(f.dir, 'existing.svg');
    f.run(`save "${file}"`);
    const original = fs.readFileSync(file, 'utf8');
    f.run('move r 1 1');
    const realWrite = fs.writeFileSync;
    const mock = t.mock.method(fs, method, (...args) => {
      if (method === 'writeFileSync') realWrite(...args);
      throw new Error('simulated filesystem failure');
    });
    f.reject('save');
    mock.mock.restore();
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.deepEqual(fs.readdirSync(f.dir), ['existing.svg']);
    f.run('undo');
  });
}

test('failed history operations do not consume stack entries', () => {
  const { CommandHistory } = require('../src/command/CommandHistory');
  const history = new CommandHistory();
  let failExecute = false;
  let failUndo = false;
  const command = {
    execute() { if (failExecute) throw new Error('execute failed'); return 'done'; },
    undo() { if (failUndo) throw new Error('undo failed'); return 'undone'; },
  };
  history.execute(command);
  failUndo = true;
  assert.throws(() => history.undo(), /undo failed/);
  assert.equal(history._undoStack.length, 1);
  failUndo = false;
  history.undo();
  failExecute = true;
  assert.throws(() => history.redo(), /execute failed/);
  assert.equal(history._redoStack.length, 1);
  assert.equal(history.execute({ execute: () => 'error: rejected', undo: () => '' }), 'error: rejected');
  assert.equal(history._redoStack.length, 1);
  failExecute = false;
  assert.equal(history.redo(), 'done');
});

for (const [label, start, end] of [
  ['typical session', '## 6.', '### 6.1'],
  ['two-node flowchart', '### 6.1', '**版本 B'],
]) {
  test(`requirements transcript: ${label}`, t => {
    const f = new Fixture(t);
    const spec = fs.readFileSync(path.resolve(__dirname, '../phase_cli_1.md'), 'utf8');
    const section = spec.slice(spec.indexOf(start), spec.indexOf(end));
    const lines = section.split(/\r?\n/);
    let commands = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('svg> ')) continue;
      let line = lines[i].slice(5);
      if (line.startsWith('save ')) line = `save "${path.join(f.dir, line.slice(5))}"`;
      if (line === 'read other.svg') line = `read "${path.resolve(__dirname, '../other.svg')}"`;
      if (lines[i + 1]?.startsWith('error:')) {
        f.reject(line);
      } else {
        f.run(line);
        f.document();
      }
      commands++;
    }
    assert.ok(commands >= 10, `expected a complete transcript, got ${commands} commands`);
    if (label === 'two-node flowchart') {
      assert.equal(f.editor.doc.countElements(), 8);
      assert.equal(f.editor.doc.findById('process').getAttribute('y'), '100');
      assert.equal(f.editor.doc.findById('process-label').getAttribute('text'), '处理数据 v2');
      assert.ok(fs.existsSync(path.join(f.dir, 'flowchart.svg')));
    } else {
      assert.equal(f.editor.doc.countElements(), 7);
      assert.equal(f.editor.doc.width, 400);
      assert.ok(f.editor.doc.hasId('rect1'));
    }
  });
}
