const { commands, Position, Range, window } = require('vscode')

const onlyRegex = /(describe|context|it)\.only/g
const skipRegex = /(describe|context|it)\.skip/g
const modifiableRunnableRegex = /(describe|context|it)(?=[ (])/

const getLineText = (editor, selection) => {
  const startLine = selection.start.line
  const range = editor.document.lineAt(startLine).range
  return editor.document.getText(range)
}

const editEachSelection = (run) => {
  const editor = window.activeTextEditor
  if (!editor) return
  const selections = editor.selections
  if (!selections || !selections.length) return

  return editor.edit((edit) => {
    selections.reverse().forEach((selection) => {
      run(editor, edit, selection)
    })
  })
}

const addToSelections = (textToAdd) => () => {
  return editEachSelection((editor, edit, selection) => {
    const text = getLineText(editor, selection)
    const match = text.match(modifiableRunnableRegex)

    if (!match) return

    const matchingWord = match[1]
    const index = text.indexOf(matchingWord) + matchingWord.length

    const position = new Position(selection.start.line, index)
    edit.insert(position, textToAdd)
  })
}

const removeFromSelections = (textToRemove) => () => {
  editEachSelection((editor, edit, selection) => {
    const text = getLineText(editor, selection)
    const index = text.indexOf(textToRemove)
    if (index < 0) return

    const start = new Position(selection.start.line, index)
    const end = new Position(selection.start.line, index + textToRemove.length)
    const range = new Range(start, end)
    edit.delete(range)
  })
}

const removeAll = (regex) => () => {
  const editor = window.activeTextEditor
  if (!editor) return

  const start = new Position(0, 0)
  const lastLine = editor.document.lineCount - 1
  const end = new Position(lastLine, editor.document.lineAt(lastLine).range.end.character)
  const range = new Range(start, end)

  const text = editor.document.getText(range)

  return editor.edit((edit) => {
    const withTextRemoved = text.replace(regex, (__, runnable) => {
      return runnable
    })
    edit.replace(range, withTextRemoved)
  })
}

const moveOnly = () => {
  return removeAll(onlyRegex)().then(() => {
    return addToSelections('.only')()
  })
}

module.exports = {
  activate (context) {
    const addOnlyCommand = commands.registerCommand('extension.addOnly', addToSelections('.only'))
    context.subscriptions.push(addOnlyCommand)
    const removeOnlyCommand = commands.registerCommand('extension.removeOnly', removeFromSelections('.only'))
    context.subscriptions.push(removeOnlyCommand)
    const removeAllOnlysCommand = commands.registerCommand('extension.removeAllOnlys', removeAll(onlyRegex))
    context.subscriptions.push(removeAllOnlysCommand)
    const moveOnlyCommand = commands.registerCommand('extension.moveOnly', moveOnly)
    context.subscriptions.push(moveOnlyCommand)

    const addSkipCommand = commands.registerCommand('extension.addSkip', addToSelections('.skip'))
    context.subscriptions.push(addSkipCommand)
    const removeSkipCommand = commands.registerCommand('extension.removeSkip', removeFromSelections('.skip'))
    context.subscriptions.push(removeSkipCommand)
    const removeAllSkipsCommand = commands.registerCommand('extension.removeAllSkips', removeAll(skipRegex))
    context.subscriptions.push(removeAllSkipsCommand)
  },
}
