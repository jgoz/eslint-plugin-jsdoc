import _ from 'lodash';
import iterateJsdoc from '../iterateJsdoc';
import jsdocUtils from '../jsdocUtils';
import exportParser from '../exportParser';
import getJSDocComment from '../eslint/getJSDocComment';

const OPTIONS_SCHEMA = {
  additionalProperties: false,
  properties: {
    publicOnly: {
      oneOf: [
        {
          default: false,
          type: 'boolean'
        },
        {
          additionalProperties: false,
          default: {},
          properties: {
            ancestorsOnly: {
              default: false,
              type: 'boolean'
            },
            cjs: {
              default: true,
              type: 'boolean'
            },
            esm: {
              default: true,
              type: 'boolean'
            },
            window: {
              default: false,
              type: 'boolean'
            }
          },
          type: 'object'
        }
      ]
    },
    require: {
      additionalProperties: false,
      default: {},
      properties: {
        ArrowFunctionExpression: {
          default: false,
          type: 'boolean'
        },
        ClassDeclaration: {
          default: false,
          type: 'boolean'
        },
        FunctionDeclaration: {
          default: true,
          type: 'boolean'
        },
        FunctionExpression: {
          default: false,
          type: 'boolean'
        },
        MethodDefinition: {
          default: false,
          type: 'boolean'
        }
      },
      type: 'object'
    }
  },
  type: 'object'
};

const getOption = (context, baseObject, option, key) => {
  if (!_.has(context, `options[0][${option}][${key}]`)) {
    return baseObject.properties[key].default;
  }

  return context.options[0][option][key];
};

const getOptions = (context) => {
  return {
    publicOnly: ((baseObj) => {
      const publicOnly = _.get(context, 'options[0].publicOnly');
      if (!publicOnly) {
        return false;
      }

      return Object.keys(baseObj.properties).reduce((obj, prop) => {
        const opt = getOption(context, baseObj, 'publicOnly', prop);
        obj[prop] = opt;

        return obj;
      }, {});
    })(OPTIONS_SCHEMA.properties.publicOnly.oneOf[1]),
    require: ((baseObj) => {
      return Object.keys(baseObj.properties).reduce((obj, prop) => {
        const opt = getOption(context, baseObj, 'require', prop);
        obj[prop] = opt;

        return obj;
      }, {});
    })(OPTIONS_SCHEMA.properties.require)
  };
};

export default iterateJsdoc(null, {
  meta: {
    doc: {
      category: 'Stylistic Issues',
      description: 'Require JSDoc comments',
      recommended: 'true',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc'
    },

    messages: {
      missingJsDoc: 'Missing JSDoc comment.'
    },

    schema: [
      OPTIONS_SCHEMA
    ],

    type: 'suggestion'
  },
  returns (context, sourceCode) {
    const {require: requireOption, publicOnly} = getOptions(context);

    const checkJsDoc = (node) => {
      const jsDocNode = getJSDocComment(sourceCode, node);

      if (jsDocNode) {
        return;
      }

      const exemptEmptyFunctions = Boolean(_.get(context, 'settings.jsdoc.exemptEmptyFunctions'));
      if (exemptEmptyFunctions) {
        const functionParameterNames = jsdocUtils.getFunctionParameterNames(node);
        if (!functionParameterNames.length && !jsdocUtils.hasReturnValue(node, context)) {
          return;
        }
      }

      if (publicOnly) {
        const opt = {
          ancestorsOnly: publicOnly.ancestorsOnly,
          esm: publicOnly.esm,
          initModuleExports: publicOnly.cjs,
          initWindow: publicOnly.window
        };
        const parseResult = exportParser.parse(sourceCode.ast, node, opt);
        const exported = exportParser.isExported(node, parseResult, opt);

        if (exported && !jsDocNode) {
          context.report({
            messageId: 'missingJsDoc',
            node
          });
        }
      } else {
        context.report({
          messageId: 'missingJsDoc',
          node
        });
      }
    };

    return {
      ArrowFunctionExpression (node) {
        if (!requireOption.ArrowFunctionExpression) {
          return;
        }

        if (node.parent.type !== 'VariableDeclarator') {
          return;
        }

        checkJsDoc(node);
      },

      ClassDeclaration (node) {
        if (!requireOption.ClassDeclaration) {
          return;
        }

        checkJsDoc(node);
      },

      FunctionDeclaration (node) {
        if (!requireOption.FunctionDeclaration) {
          return;
        }

        checkJsDoc(node);
      },

      FunctionExpression (node) {
        if (requireOption.MethodDefinition && node.parent.type === 'MethodDefinition') {
          checkJsDoc(node);

          return;
        }

        if (!requireOption.FunctionExpression) {
          return;
        }

        if (node.parent.type === 'VariableDeclarator' || node.parent.type === 'AssignmentExpression') {
          checkJsDoc(node);
        }

        if (node.parent.type === 'Property' && node === node.parent.value) {
          checkJsDoc(node);
        }
      }
    };
  }
});
