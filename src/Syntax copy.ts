import {InputRule} from "prosemirror-inputrules"
import { TextSelection } from "prosemirror-state"
import { mySchema } from "./schema"
import asciidoc from "./language/asciidoc.json"


type SyntaxRule = {
    type: "block" | "mark"
    trigger: string
    node?: string
    mark?: string
    level?: number
    getAttrs?: string | ((match: string[]) => any)
    restoreSource?: string | ((attrs: any) => string)
    autoRestoreOnEmpty?: boolean
  }
  
type PluginManifest = {
    name: string
    rules: SyntaxRule[]
}
const asciidocManifest = asciidoc as unknown as PluginManifest


export const SyntaxRegistry = () => {
  const inputRules = [] as InputRule[]

  const register = (rule: InputRule) => {
    inputRules.push(rule)
  }

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
      const strongMark = mySchema.marks.strong
      const emMark = mySchema.marks.em
      
      if (!strongMark || !emMark) {
        return null
      }
      
      // 创建带有 strong 和 em 标记的文本节点
      const textNode = mySchema.text(text, [
        strongMark.create(),
        emMark.create()
      ])

      const paragraph = mySchema.text(" ",[])

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

  inputRules.push(
      headingLevel4Rule,  // 最长的先匹配
      headingLevel3Rule,
      headingLevel2Rule,
      boldItalicRule
  )
  return inputRules
}

() =>{
  asciidocManifest.rules.forEach(
    (rule)=>{
      if(rule.type === "block"){
        new InputRule(new RegExp(rule.trigger), 
          (state, match, start, end)=>{
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
            
            // 使用 state.schema 而不是局部创建的 mySchema
            tr.setBlockType(newBlockStart, newBlockEnd, mySchema.nodes.heading, { level: 1 })
              .scrollIntoView()

            tr.setMeta("intentional_heading", true)
            return tr
          }
        )
        SyntaxRegistry.register(rule)
      }
    }
  )
}
