import { v4 as uuid } from 'uuid'
import { ZBClient } from 'zeebe-node'
import {
	ZeebeMapFunctionInput,
	ZeebeMapFunctionResponse,
} from '../../lib/ZeebeMapper'
import { deployMapFunctionWorkflow } from './lib/deployMapFunctionWorkflow'

const mapFunctionWorkflow = './bpmn/do-processing'

const zbc = new ZBClient('localhost')

async function main() {
	await deployMapFunctionWorkflow()
	createWorker()
}

function createWorker() {
	return zbc.createWorker<ZeebeMapFunctionInput>(
		uuid(),
		'do-processing',
		(job, complete) => {
			const { element = '', correlationKey } = job.variables
			const currentValue = element
				.split('')
				.reverse()
				.join('')
				.toUpperCase()
			// Simulate a processing task that takes 2 - 15 seconds to complete
			setTimeout(() => {
				zbc.publishMessage<ZeebeMapFunctionResponse>({
					name: 'collect-result',
					correlationKey,
					timeToLive: 30000,
					messageId: uuid(),
					variables: {
						element: currentValue,
					},
				})
				console.log(`\nOutput: ${currentValue}`)
				complete()
			}, Math.max(2000, Math.random() * 15000))
		},
		{
			timeout: 20000,
		}
	)
}

main()
