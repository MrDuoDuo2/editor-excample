// src/main.ts  (只改这一段，其余保持不变)

import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { inputRules } from "prosemirror-inputrules"   // ← 新增这行
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import { TextSelection, NodeSelection } from "prosemirror-state"
import { Plugin } from "prosemirror-state"
import { SyntaxRegistry } from "./Syntax"
import asciidoc from "./language/asciidoc.json"
import { mySchema } from "./schema"
import { PluginManifest } from "./PluginManifest"
import { NodeView } from "prosemirror-view"
import {
  EditorView as CodeMirror, keymap as cmKeymap, drawSelection
} from "@codemirror/view"
import {javascript} from "@codemirror/lang-javascript"
import {rust} from "@codemirror/lang-rust"
import {python} from "@codemirror/lang-python"
import {defaultKeymap} from "@codemirror/commands"
import {syntaxHighlighting, defaultHighlightStyle} from "@codemirror/language"
import "./code.css"

// class CodeBlockView {
//   node: any
//   dom: HTMLElement
//   contentDOM: HTMLElement

//   constructor(node, view, getPos) {
//     this.node = node

//     // 外层容器（美化用）
//     this.dom = document.createElement("div")
//     this.dom.className = "code-block-wrapper"

//     // 语言标签 + 复制按钮
//     const header = document.createElement("div")
//     header.className = "code-block-header"

//     const lang = node.attrs.language || "text"
//     const langSpan = document.createElement("span")
//     langSpan.className = "code-lang"
//     langSpan.textContent = lang

//     const copyBtn = document.createElement("button")
//     copyBtn.className = "code-copy-btn"
//     copyBtn.textContent = "Copy"
//     copyBtn.onclick = () => {
//       navigator.clipboard.writeText(node.textContent)
//       copyBtn.textContent = "Copied!"
//       setTimeout(() => copyBtn.textContent = "Copy", 2000)
//     }

//     header.appendChild(langSpan)
//     header.appendChild(copyBtn)
//     this.dom.appendChild(header)

//     // 真正的 <pre><code>（ProseMirror 用它来编辑内容）
//     const pre = document.createElement("pre")
//     const code = document.createElement("code")
//     code.className = `language-${lang}`
//     pre.appendChild(code)
//     this.dom.appendChild(pre)

//     this.contentDOM = code  // 光标和输入都在这里

//     // Create a CodeMirror instance
//     this.cm = new CodeMirror({
//       doc: this.node.textContent,
//       extensions: [
//         cmKeymap.of([
//           ...defaultKeymap
//         ]),
//         drawSelection(),
//         syntaxHighlighting(defaultHighlightStyle),
//         javascript(),
//         // CodeMirror.updateListener.of(update => this.forwardUpdate(update))
//       ]
//     })
//   }

//   // 可选：更新语言时重新渲染
//   update(node) {
//     if (node.type.name !== "code_block") return false
//     if (node.attrs.language !== this.node.attrs.language) {
//       const langSpan = this.dom.querySelector(".code-lang")
//       if (langSpan) langSpan.textContent = node.attrs.language || "text"
//     }
//     this.node = node
//     return true
//   }
// }


class CodeBlockView {
  node: any
  dom: HTMLElement
  // contentDOM: HTMLElement
  view: any
  getPos: any
  cm: CodeMirror
  updating: boolean

  constructor(node: any, view: any, getPos: any) {
    // Store for later
    this.node = node
    this.view = view
    this.getPos = getPos


        //语言标签
    const header = document.createElement("div")
    header.className = "code-block-header"
    const lang = node.attrs.language || "javascript"
    const langSpan = document.createElement("span")
    langSpan.className = "code-lang"
    langSpan.textContent = lang
    // const copyBtn = document.createElement("button")
    // copyBtn.className = "code-copy-btn"
    // copyBtn.textContent = "Copy"
    // copyBtn.onclick = () => {
    //   navigator.clipboard.writeText(node.textContent)
    //   copyBtn.textContent = "Copied!"
    //   setTimeout(() => copyBtn.textContent = "Copy", 2000)
    // }
    header.appendChild(langSpan)
    // header.appendChild(copyBtn)
    // this.dom.appendChild(header)
    // this.dom = header
    // this.dom.appendChild(this.cm.dom)

    // Create a CodeMirror instance
    this.cm = new CodeMirror({
      doc: this.node.textContent,
      extensions: [
        cmKeymap.of([
          // ...this.codeMirrorKeymap(),
          ...defaultKeymap
        ]),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle),
        javascript(),
        // CodeMirror.updateListener.of(update => this.forwardUpdate(update))
      ]
    })


    // this.dom = this.cm.dom

    // The editor's outer node is our DOM representation

    // 外层容器（美化用）
    this.dom = document.createElement("div")
    this.dom.className = "code-block-wrapper"
    this.dom.style.color = "white"
    this.dom.append(header)
    this.dom.append(this.cm.dom)
     
    // This flag is used to avoid an update loop between the outer and
    // inner editor
    this.updating = false
    
    // 延迟调用 focus，确保 DOM 已经渲染完成
    // 使用 requestAnimationFrame 确保在下一帧渲染后执行
    requestAnimationFrame(() => {
      this.cm.focus()
    })
  }
  
  // 可选：添加 update 方法来处理节点更新
  update(node: any) {
    if (node.type.name !== "code_block") return false
    if (node.attrs.language !== this.node.attrs.language) {
      // 更新语言显示等
      this.node = node
    }
    return true
  }

}

// 注册 NodeView 的 Plugin（这可能是你看到的 “NodeViewPlugin”）
const nodeViewPlugin = new Plugin({
  props: {
    nodeViews: {
      code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos), // 只针对 code_block 节点
    }
  }
});

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
    // console.log(newState.doc)
    // console.log(view.state.plugins)
    // 遍历所有变化的范围
    newState.doc.descendants((node, pos) => {
      console.log(node)
      // 只关心 heading 节点
      if (node.type.name != "text" && node.content.size === 0 && isDeleteKey) {
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

SyntaxRegistry.register(asciidoc as unknown as PluginManifest)

// 3. 创建编辑器，把我们的 rule 加进去
const view = new EditorView(document.getElementById("editor")!, {
  state: EditorState.create({
    schema: mySchema,
    plugins: [
      history(),
      keymap({"Mod-z": undo, "Mod-y": redo}),
      keymap(baseKeymap),
      inputRules({ rules: SyntaxRegistry.buildInputRules() }),
      restoreSourceOnEmptyHeading,   // ← 加上这行！
      nodeViewPlugin
    ]
  })
})

view.dom.addEventListener("click", (event) => {
  const clickedDOM = event.target as HTMLElement
  
  // 关键一行！拿到点击位置的 pos
  const pos = view.posAtDOM(clickedDOM, 0)   // 第2个参数是 offset，一般写 0 就行
  
  if (pos !== null && pos !== undefined) {
    console.log("你点击的 DOM 对应的 pos 是：", pos)
    // // 顺手把光标跳过去（可选）
    // const selection = TextSelection.create(view.state.doc, pos)
    // view.dispatch(view.state.tr.setSelection(selection))
  }
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

window.createMultiLineText = () => {
   console.log("createMultiLineText")
   const tr = view.state.tr
   tr.insert(0, mySchema.nodes.code_block.createAndFill({language: "JavaScript"}))
   view.dispatch(tr)
}

window.selectionMoveToNine = () => {
    const selection = TextSelection.create(view.state.doc, 9)
    view.dispatch(view.state.tr.setSelection(selection))
}