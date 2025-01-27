import _ from 'lodash';
import iterateJsdoc from '../iterateJsdoc';

export default iterateJsdoc(({
  jsdoc,
  report,
  utils
}) => {
  if (utils.avoidDocs()) {
    return;
  }

  const targetTagName = utils.getPreferredTagName('description');

  const functionExamples = _.filter(jsdoc.tags, {
    tag: targetTagName
  });

  if (!functionExamples.length) {
    report('Missing JSDoc @' + targetTagName + ' declaration.');

    return;
  }

  functionExamples.forEach((example) => {
    const exampleContent = _.compact((example.name + ' ' + example.description).trim().split('\n'));

    if (!exampleContent.length) {
      report('Missing JSDoc @' + targetTagName + ' description.');
    }
  });
}, {
  meta: {
    type: 'suggestion'
  },
  returns (context) {
    const defaultContexts = [
      'ArrowFunctionExpression',
      'FunctionDeclaration',
      'FunctionExpression'
    ];

    const {
      noDefaults,
      contexts: ctxts = []
    } = context.options[0] || {};

    const contexts = typeof ctxts === 'string' ? [ctxts] : ctxts;

    return noDefaults ?
      contexts :
      [...new Set([...defaultContexts, ...contexts])];
  },
  schema: [
    {
      additionalProperties: false,
      properties: {
        contexts: {
          oneOf: [
            {
              items: {
                type: 'string'
              },
              type: 'array'
            },
            {
              type: 'string'
            }
          ]
        },
        exemptedBy: {
          items: {
            type: 'string'
          },
          type: 'array'
        },
        noDefaults: {
          type: 'boolean'
        }
      },
      type: 'object'
    }
  ]
});
