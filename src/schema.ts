import { Schema } from "prosemirror-model"
import { addListNodes } from "prosemirror-schema-list"
import { schema as basicSchema } from "prosemirror-schema-basic"

export const mySchema = new Schema({
    nodes: addListNodes(basicSchema.spec.nodes as any, "paragraph block*", "block"),
    marks: basicSchema.spec.marks
  })