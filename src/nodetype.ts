import { mySchema } from "./schema"

export const heading = mySchema.nodes.heading
export const StrongMark = mySchema.marks.strong
export const EmMark = mySchema.marks.em

export const checkMark = (mark: string) => {
    if(mark === "strongMark"){
        return StrongMark
    }
    if(mark === "emMark"){
        return EmMark
    }
    return null
}