import { readFileSync } from 'node:fs';
import path from 'node:path';

import DOMPurify from 'dompurify';
import * as ts from 'typescript';

const loadComponentSource = (fileName: string): ts.SourceFile =>
  ts.createSourceFile(
    fileName,
    readFileSync(path.join(__dirname, fileName), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

const isDomPurifySanitizeCall = (expression: ts.Expression): boolean =>
  ts.isCallExpression(expression) &&
  ts.isPropertyAccessExpression(expression.expression) &&
  ts.isIdentifier(expression.expression.expression) &&
  expression.expression.expression.text === 'DOMPurify' &&
  expression.expression.name.text === 'sanitize';

const getPropertyInitializer = (
  expression: ts.Expression,
  propertyName: string,
): ts.Expression | undefined => {
  if (!ts.isObjectLiteralExpression(expression)) {
    return undefined;
  }

  const property = expression.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) &&
      candidate.name.getText() === propertyName,
  );

  return property?.initializer;
};

const findSanitizedDangerousHtmlSinks = (sourceFile: ts.SourceFile): number => {
  let sinkCount = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === 'dangerouslySetInnerHTML' &&
      node.initializer !== undefined &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression !== undefined
    ) {
      const html = getPropertyInitializer(node.initializer.expression, '__html');
      if (html !== undefined && isDomPurifySanitizeCall(html)) {
        sinkCount += 1;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return sinkCount;
};

const findDangerousHtmlSinks = (sourceFile: ts.SourceFile): number => {
  let sinkCount = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === 'dangerouslySetInnerHTML'
    ) {
      sinkCount += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return sinkCount;
};

const findSanitizedInnerHtmlAssignments = (sourceFile: ts.SourceFile): number => {
  let sinkCount = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === 'innerHTML' &&
      isDomPurifySanitizeCall(node.right)
    ) {
      sinkCount += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return sinkCount;
};

const findInnerHtmlAssignments = (sourceFile: ts.SourceFile): number => {
  let sinkCount = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === 'innerHTML'
    ) {
      sinkCount += 1;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return sinkCount;
};

describe('rich-text security controls', () => {
  it('removes executable markup from rich-text content', () => {
    const sanitized = DOMPurify.sanitize(
      '<img src=x onerror="window.xss = true"><script>window.xss = true</script><a href="javascript:alert(1)">link</a><span>safe text</span>',
    );

    expect(sanitized).toContain('safe text');
    expect(sanitized).not.toMatch(/onerror|<script|javascript:/i);
  });

  it('keeps Calculator dangerous HTML rendering behind DOMPurify', () => {
    const calculatorSource = loadComponentSource('Calculator.tsx');
    const dangerousHtmlSinks = findDangerousHtmlSinks(calculatorSource);
    const sanitizedDangerousHtmlSinks =
      findSanitizedDangerousHtmlSinks(calculatorSource);

    expect(dangerousHtmlSinks).toBe(1);
    expect(sanitizedDangerousHtmlSinks).toBe(dangerousHtmlSinks);
  });

  it('keeps every TextEditor HTML sink behind DOMPurify', () => {
    const textEditorSource = loadComponentSource('TextEditor.tsx');
    const dangerousHtmlSinks = findDangerousHtmlSinks(textEditorSource);
    const sanitizedDangerousHtmlSinks =
      findSanitizedDangerousHtmlSinks(textEditorSource);
    const innerHtmlAssignments = findInnerHtmlAssignments(textEditorSource);
    const sanitizedInnerHtmlAssignments =
      findSanitizedInnerHtmlAssignments(textEditorSource);

    expect(dangerousHtmlSinks).toBe(1);
    expect(sanitizedDangerousHtmlSinks).toBe(dangerousHtmlSinks);
    expect(innerHtmlAssignments).toBe(2);
    expect(sanitizedInnerHtmlAssignments).toBe(innerHtmlAssignments);
  });
});
