import { LoremIpsum } from 'lorem-ipsum'
import { ZeebeMapper } from '../../lib/ZeebeMapper'
import { deployMapFunctionWorkflow } from './lib/deployMapFunctionWorkflow'

async function main() {
	await deployMapFunctionWorkflow()

	const zmap = new ZeebeMapper('localhost')

	const lorem = new LoremIpsum({
		sentencesPerParagraph: {
			max: 6,
			min: 2,
		},
		wordsPerSentence: {
			max: 8,
			min: 4,
		},
	})

	const content = lorem.generateParagraphs(180).split('\n')
	console.log(`Input: ${content.length} elements`)
	zmap.map(content, 'do-processing', { callback: console.log })
}

main()
