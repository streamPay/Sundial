// copy & modified from cz-conventional-changelog

const wrap = require('word-wrap')
const map = require('lodash.map')
const longest = require('longest')
const rightPad = require('right-pad')
const types = require('./types.js')

let length = longest(Object.keys(types)).length + 1
let choices = map(types, (type, key) => {
    return {
        name: rightPad(key + ':', length) + ' ' + type.description,
        value: key
    }
})

module.exports = {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function (cz, commit) {
        console.log('\n首行最多 100 个字符，超过会被截断。其他行每 100 个字符换行。\n');

        // Let's ask some questions of the user
        // so that we can populate our commit
        // template.
        //
        // See inquirer.js docs for specifics.
        // You can also opt to use another input
        // collection library if you prefer.
        cz.prompt([{
            type: 'list',
            name: 'type',
            message: '请选择即将提交的改动的类型:',
            choices: choices
        }, {
            type: 'input',
            name: 'scope',
            message: '此次改动的范围是 (例如 组件或文件名)? (回车以跳过)\n'
        }, {
            type: 'input',
            name: 'brief',
            message: '请填写此次改动的简要说明:\n'
        }, {
            type: 'input',
            name: 'detail',
            message: '请填写此次改动的详细说明: (回车以跳过)\n'
        }, {
            type: 'input',
            name: 'issues',
            message: '此次改动是否有关联的 issue ，如有请填写 (例如 "#123")? (回车以跳过)'
        }]).then(function (answers) {

            let maxLineWidth = 100

            let wrapOptions = {
                trim: true,
                newline: '\n',
                indent: '',
                width: maxLineWidth
            }

            // Hard limit this line
            let issues = answers.issues ? `[${answers.issues}]` : ''
            let head = (`[${answers.type}]${issues} ${answers.brief.trim()}`).slice(0, maxLineWidth)

            // parentheses are only needed when a scope is present
            let scope = answers.scope.trim()
            scope = scope ? `${wrap('(' + scope + ')', wrapOptions)}\n\n` : ''

            // Wrap these lines at 100 characters
            let body = wrap(answers.detail, wrapOptions)

            commit(head + '\n\n' + scope + body)
        })
    }
};
