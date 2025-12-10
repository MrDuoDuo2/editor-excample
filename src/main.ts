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

// 1. 扩展 schema（支持标题、列表等）
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes as any, "paragraph block*", "block"),
  marks: basicSchema.spec.marks
})

// 2. 关键！定义 "= " → 一级标题的 InputRule
const headingLevel1Rule = new InputRule(
  // 正则：行首一个等号 + 空格（^ 表示行首）
  /^=\s$/,
  (state, match, start, end) => {
    // 把这一整行（从 start 到 end）替换成 heading 节点（level=1）
    return state.tr
      .setBlockType(start, end, mySchema.nodes.heading, { level: 1 })
      .scrollIntoView()  // 可选：自动滚动到可见区域
  }
)

// 3. 创建编辑器，把我们的 rule 加进去
const view = new EditorView(document.getElementById("editor")!, {
  state: EditorState.create({
    schema: mySchema,
    plugins: [
      history(),
      keymap({"Mod-z": undo, "Mod-y": redo}),
      keymap(baseKeymap),
      inputRules({ rules: [headingLevel1Rule] })
    ]
  })
})

// 暴露全局方便你玩
;(window as any).view = view