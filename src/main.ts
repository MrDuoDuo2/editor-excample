// src/main.ts  (只改这一段，其余保持不变)

import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema } from "prosemirror-model"
import { schema as basicSchema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { InputRule, inputRules } from "prosemirror-inputrules"   // ← 新增这行
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import { TextSelection } from "prosemirror-state"
import { Plugin } from "prosemirror-state"

// 1. 扩展 schema（支持标题、列表等）
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes as any, "paragraph block*", "block"),
  marks: basicSchema.spec.marks
})

// 2. 关键！定义标题转换的 InputRule
// 一级标题：= 
const headingLevel1Rule = new InputRule(
  // 正则：行首一个等号 + 空格（^ 表示行首）
  /^=\s$/,
  (state, match, start, end) => {
    // 关键判断：当前光标所在的 block 必须是 paragraph
    const $pos = state.selection.$anchor
    const currentBlockType = $pos.parent.type

    // 如果不是 paragraph，直接拒绝触发
    if (currentBlockType.name !== "paragraph") {
      return null
    }

    // 先找到包含这段文本的块节点的位置
    const $start = state.doc.resolve(start)
    const blockStart = $start.start($start.depth)
    const blockEnd = $start.end($start.depth)
    
    // 删除匹配的文本，然后设置块类型
    const tr = state.tr
    tr.delete(start, end)
    
    // 使用映射来计算删除后的块位置
    const deletedLength = end - start
    const newBlockStart = blockStart
    const newBlockEnd = blockEnd - deletedLength
    
    tr.setBlockType(newBlockStart, newBlockEnd, mySchema.nodes.heading, { level: 1 })
      .scrollIntoView()

    tr.setMeta("intentional_heading", true)
    return tr
  }
)

// 二级标题：== 
const headingLevel2Rule = new InputRule(
  /^==\s$/,
  (state, match, start, end) => {
    const $pos = state.selection.$anchor
    const currentBlockType = $pos.parent.type

    if (currentBlockType.name !== "paragraph") {
      return null
    }

    const $start = state.doc.resolve(start)
    const blockStart = $start.start($start.depth)
    const blockEnd = $start.end($start.depth)
    
    const tr = state.tr
    tr.delete(start, end)
    
    const deletedLength = end - start
    const newBlockStart = blockStart
    const newBlockEnd = blockEnd - deletedLength
    
    tr.setBlockType(newBlockStart, newBlockEnd, mySchema.nodes.heading, { level: 2 })
      .scrollIntoView()

    tr.setMeta("intentional_heading", true)
    return tr
  }
)

// 三级标题：=== 
const headingLevel3Rule = new InputRule(
  /^===\s$/,
  (state, match, start, end) => {
    const $pos = state.selection.$anchor
    const currentBlockType = $pos.parent.type

    if (currentBlockType.name !== "paragraph") {
      return null
    }

    const $start = state.doc.resolve(start)
    const blockStart = $start.start($start.depth)
    const blockEnd = $start.end($start.depth)
    
    const tr = state.tr
    tr.delete(start, end)
    
    const deletedLength = end - start
    const newBlockStart = blockStart
    const newBlockEnd = blockEnd - deletedLength
    
    tr.setBlockType(newBlockStart, newBlockEnd, mySchema.nodes.heading, { level: 3 })
      .scrollIntoView()

    tr.setMeta("intentional_heading", true)
    return tr
  }
)

// 四级标题：==== 
const headingLevel4Rule = new InputRule(
  /^====\s$/,
  (state, match, start, end) => {
    const $pos = state.selection.$anchor
    const currentBlockType = $pos.parent.type

    if (currentBlockType.name !== "paragraph") {
      return null
    }

    const $start = state.doc.resolve(start)
    const blockStart = $start.start($start.depth)
    const blockEnd = $start.end($start.depth)
    
    const tr = state.tr
    tr.delete(start, end)
    
    const deletedLength = end - start
    const newBlockStart = blockStart
    const newBlockEnd = blockEnd - deletedLength
    
    tr.setBlockType(newBlockStart, newBlockEnd, mySchema.nodes.heading, { level: 4 })
      .scrollIntoView()

    tr.setMeta("intentional_heading", true)
    return tr
  }
)

const boldItalicRule = new InputRule(
  /\*\*\*(.+?)\*\*\*/,
  (state, match, start, end) => {
    const text = match[1]
    
    // 检查 schema 中是否有 strong 和 em 标记
    const strongMark = state.schema.marks.strong
    const emMark = state.schema.marks.em
    
    if (!strongMark || !emMark) {
      return null
    }
    
    // 创建带有 strong 和 em 标记的文本节点
    const textNode = state.schema.text(text, [
      strongMark.create(),
      emMark.create()
    ])

    const paragraph = state.schema.text(" ",[])

    // 创建 transaction：删除匹配的文本，插入新节点
    const tr = state.tr
    tr.replaceWith(start, end, [textNode,paragraph])
    
    // 将光标设置到带标记文本节点的末尾，这样用户就可以继续输入普通文本
    const newPos = start + textNode.nodeSize
    tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), -1))
    tr.scrollIntoView()
    
    return tr
  }
)

// 核心插件：监听空标题，自动降级并恢复源码
const restoreSourceOnEmptyHeading = new Plugin({
  // 第一步：键盘按下时，给这次操作打上“删除键”标签
  props: {
    handleKeyDown(view, event) {
      if (event.key === "Backspace" || event.key === "Delete") {
        // 给接下来的 Transaction 打上标记
        view.dispatch(view.state.tr.setMeta("deleteKeyPressed", true))
        // 返回 false = 让默认删除行为继续执行
        return false
      }
      return false
    }
  },

  appendTransaction(transactions, oldState, newState) {
    // 关键判断：最近一次用户操作是不是按了删除键？
    const lastAction = transactions[transactions.length - 1]
    const isDeleteKey = lastAction?.getMeta("deleteKeyPressed")

    const lastTr = transactions[transactions.length - 1]
    if (lastTr && lastTr.getMeta("intentional_heading")) {
      return null  // 直接跳过，不做任何处理
    }

    const tr = newState.tr
    let modified = false
    console.log(newState.doc)
    // 遍历所有变化的范围
    newState.doc.descendants((node, pos) => {
      // 只关心 heading 节点
      if (node.type.name === "heading" && node.content.size === 0 && isDeleteKey) {
        // 找到空标题的位置
        const from = pos
        const to = pos + node.nodeSize

        const newPara = newState.schema.nodes.paragraph.createAndFill(
          {}
        )

        tr.replaceWith(from, to, newPara!)

        const resolvedPos = tr.doc.resolve(from)
        tr.setSelection(TextSelection.near(resolvedPos, 1))

        modified = true
      }
    })

    return modified ? tr : null
  }
})

// 3. 创建编辑器，把我们的 rule 加进去
const view = new EditorView(document.getElementById("editor")!, {
  state: EditorState.create({
    schema: mySchema,
    plugins: [
      history(),
      keymap({"Mod-z": undo, "Mod-y": redo}),
      keymap(baseKeymap),
      inputRules({ 
        rules: [
          headingLevel4Rule,  // 最长的先匹配
          headingLevel3Rule,
          headingLevel2Rule,
          headingLevel1Rule,
          boldItalicRule
        ] 
      }),
      restoreSourceOnEmptyHeading   // ← 加上这行！
    ]
  })
})


// 暴露全局方便你玩
;(window as any).view = view


window.createFromJSON = () => {
  // 这就是你要的 JSON（可以来自你的 WASM 黑盒）
  const json = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "这是 WASM 吐出来的标题" }]
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "这里有" },
          { type: "text", text: "加粗文字", marks: [{ type: "strong" }] },
          { type: "text", text: " 和 " },
          { type: "text", text: "斜体文字", marks: [{ type: "em" }] }
        ]
      },
      {
        type: "bullet_list",
        content: [
          {
            type: "list_item",
            content: [{ type: "paragraph", content: [{ type: "text", text: "第一项" }] }]
          },
          {
            type: "list_item",
            content: [{ type: "paragraph", content: [{ type: "text", text: "第二项" }] }]
          }
        ]
      }
    ]
  }

  // 关键三行！把 JSON 变成真实 Node
  const newNode = view.state.schema.nodeFromJSON(json)   // 方法1（推荐）
  // const newNode = Node.fromJSON(view.state.schema, json)  // 方法2（等价）

  // 用 Transaction 替换整个文档
  const tr = view.state.tr
  tr.replaceWith(0, view.state.doc.content.size, newNode.content)
  // tr.setSelection(Selection.atEnd(tr.doc))  // 可选：光标放到最后
  view.dispatch(tr)
  console.log("JSON 已成功变成真实文档！")
}

// 暴露到全局方便你玩
window.replaceCurrentBlockWithJSON = (blockJSON: any) => {
  const { view } = window as any
  if (!view) return console.error("view 未定义")

  const { state, dispatch } = view
  const { selection } = state
  if (selection.empty) {
    console.error("请把光标放在要替换的行内")
    return
  }

  // 关键：找到当前光标所在的 block 节点（paragraph / heading / list_item 等）
  const $pos = selection.$anchor
  const blockPos = $pos.start($pos.depth) - 1  // block 开始位置（包括开头的虚拟位置）
  const blockEnd = $pos.end($pos.depth) + 1    // block 结束位置

  // 从 JSON 创建新的 block 节点（比如 heading）
  const newBlockNode = state.schema.nodeFromJSON({
    type: "heading",
    attrs: { level: 1 },
    content: [{ type: "text", text: blockJSON.text || "新标题" }]
    // 你可以传任意结构：加粗、列表项、代码块……
  })

  // 精准替换当前 block
  const tr = state.tr
  tr.replaceWith(blockPos, blockEnd, newBlockNode)

  // 正确方式：用 TextSelection.near() 创建光标在节点末尾的选区
  // 节点末尾位置：blockPos + 1（节点内容开始） + newBlockNode.content.size（内容长度）
  const endPos = blockPos + 1 + newBlockNode.content.size
  const newSelection = TextSelection.near(tr.doc.resolve(endPos), -1)  // -1 表示偏向后方（末尾）

  tr.setSelection(newSelection)
  tr.scrollIntoView()

  dispatch(tr)
  console.log("当前 block 已替换！光标放到末尾")
}