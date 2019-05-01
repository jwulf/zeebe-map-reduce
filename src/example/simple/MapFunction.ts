import { LoremIpsum } from 'lorem-ipsum'
import { ZeebeMapFunction } from '../../lib/ZeebeMapProcess'
import { deployMapFunctionWorkflow } from './lib/deployMapFunctionWorkflow'

async function main() {
	await deployMapFunctionWorkflow()

	const zmap = new ZeebeMapFunction({
		brokerAddress: 'localhost',
		mapFunctionId: 'do-processing',
	})

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
	zmap.map(content, { callback: console.log })
}

main()
