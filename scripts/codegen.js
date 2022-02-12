// @ts-check
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { visit, parse } = require('graphql');
const { schema: rawSchema } = require('../src/graphql/schema');

const schema = parse(rawSchema);
const declarations = createNamespaceDeclaration(gatherTypeDeclarations(gatherEnums()));

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const out = printer.printNode(
  ts.EmitHint.Unspecified,
  declarations,
  ts.createSourceFile('schema.d.ts', '', ts.ScriptTarget.ESNext)
);

// Validate generated code
const { diagnostics } = ts.transpileModule(out, { reportDiagnostics: true });
fs.writeFileSync(path.resolve(__dirname, '../src/schema.d.ts'), out);
if (diagnostics.length) {
  console.error('schema.d.ts was generated with errors');
  process.exit(1);
}

/** @param {import('typescript').Statement[]} statements */
function createNamespaceDeclaration(statements) {
  return ts.createModuleDeclaration(
    undefined,
    ts.createModifiersFromModifierFlags(ts.ModifierFlags.Ambient),
    ts.createIdentifier('grvsc'),
    ts.createModuleBlock([
      ts.createModuleDeclaration(
        undefined,
        undefined,
        ts.createIdentifier('gql'),
        ts.createModuleBlock(statements),
        ts.NodeFlags.Namespace
      )
    ]),
    ts.NodeFlags.Namespace
  );
}

function gatherEnums() {
  /** @type {Map<string, string[]>} */
  const enums = new Map();
  visit(schema, {
    EnumTypeDefinition: node => {
      enums.set(
        node.name.value,
        node.values.map(v => v.name.value)
      );
    }
  });
  return enums;
}

/** @param {Map<string, string[]>} enums */
function gatherTypeDeclarations(enums) {
  const ignore = () => {};
  const stop = () => false;
  /** @type {import('typescript').Statement[]} */
  const types = [];
  visit(schema, {
    Document: ignore,
    EnumTypeDefinition: stop,
    ObjectTypeDefinition: {
      enter: node => {
        types.push(
          ts.createInterfaceDeclaration(
            undefined,
            undefined,
            node.name.value,
            undefined,
            node.interfaces.length ? [transformImplementsToExtends(node.interfaces)] : undefined,
            node.fields.map(transformFieldDefinitionNode)
          )
        );

        return false;
      }
    },
    InputObjectTypeDefinition: {
      enter: node => {
        types.push(
          ts.createInterfaceDeclaration(
            undefined,
            undefined,
            node.name.value,
            undefined,
            undefined,
            node.fields.map(transformFieldDefinitionNode)
          )
        );

        return false;
      }
    },
    enter: node => {
      throw new Error(`Unknown node kind '${node.kind}'`);
    }
  });
  return types;

  /** @param {readonly import('graphql').NamedTypeNode[]} interfaces */
  function transformImplementsToExtends(interfaces) {
    return ts.createHeritageClause(
      ts.SyntaxKind.ExtendsKeyword,
      interfaces.map(({ name }) => ts.createExpressionWithTypeArguments(undefined, ts.createIdentifier(name.value)))
    );
  }

  /** @param {import('graphql').FieldDefinitionNode | import('graphql').InputValueDefinitionNode} field */
  function transformFieldDefinitionNode(field) {
    return ts.createPropertySignature(
      undefined,
      field.name.value,
      field.type.kind !== 'NonNullType' ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      transformTypeNode(field.type),
      undefined
    );
  }

  /** @param {import('graphql').TypeNode} typeNode */
  function transformTypeNode(typeNode) {
    switch (typeNode.kind) {
      case 'ListType':
        return ts.createArrayTypeNode(transformTypeNode(typeNode.type));
      case 'NonNullType':
        return transformTypeNode(typeNode.type);
      case 'NamedType':
        const enumType = enums.get(typeNode.name.value);
        return enumType
          ? ts.createUnionTypeNode(enumType.map(value => ts.createLiteralTypeNode(ts.createStringLiteral(value))))
          : ts.createTypeReferenceNode(mapTypeName(typeNode.name.value), undefined);
    }
  }

  /** @param {string} name */
  function mapTypeName(name) {
    switch (name) {
      case 'String':
        return 'string';
      case 'Int':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'DateTime':
        return 'Date';
      case 'JSON':
        return 'any';
      default:
        return name;
    }
  }
}
