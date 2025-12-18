import { MergeResults } from "./generateCode"

export class Validator {
    public injectedCode: string
    private processors: Record<string, (src: string) => MergeResults> = {}
    constructor(codeSource: string) {
        this.injectedCode = codeSource
    }
    register(codeSeg: string, processor: (src: string) => MergeResults) {
        this.processors[codeSeg] = processor
    }
    invoke() {
        Object.entries(this.processors).forEach(([codeSeg, processor]) => {
            const { didClear, didMerge, contents } = processor(this.injectedCode)
            if (didClear) {
                console.log(`[CodeValidator] ${codeSeg} cleared`)
            }
            if (didMerge) {
                console.log(`[CodeValidator] ${codeSeg} merged`)
            }
            this.injectedCode = contents
        })
        return this.injectedCode
    }
}