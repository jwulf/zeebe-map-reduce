import { v4 as uuid } from 'uuid'
import { ZBClient } from 'zeebe-node'
const mapWorkflowFile = './bpmn/map-reduce.bpmn'

/**
 * Note: The mapfunction workers can scale, but this cannot.
 */
export interface MapReduceInput {
	callbackMessageCorrelationKey?: string
	callbackMessageName?: string
	callbackProcessId?: string
	elements: any[]
	done: boolean
	mapFunctionWorkflowId: string
	correlationKey: string
	accumulator: any[]
}

export interface ZeebeMapFunctionInput {
	element: any
	correlationKey: string
}

export interface ZeebeMapFunctionResponse {
	element: any
}

interface MapReduceOutput extends MapReduceInput {
	element: any
}

export interface MapTaskCallback {
	callbackProcessId?: string
	callbackMessageCorrelationKey?: string
	callbackMessageName?: string
	callback?: (output: any[]) => void
}

interface MapTask extends MapTaskCallback {
	correlationKey: string
	workflowInstanceMd: any
}

export class ZeebeMapper<Input, Headers, Output> {
	private zbc: ZBClient
	private ready: boolean = false
	private tasks: { [key: string]: MapTask }
	private queue: any[] = []

	constructor(brokerAddress: string) {
		this.zbc = new ZBClient(brokerAddress)
		this.createReducerWorker()
		this.createOutputWorker()
		this.createMapWorker()
		this.zbc.deployWorkflow(mapWorkflowFile).then(() => {
			console.log('Waiting 2 seconds to ensure all workers are ready...')
			setTimeout(() => {
				this.ready = true
				this.queue.forEach(task => {
					console.log('Executing queued map task')
					this.map(task.elements, task.mapFunctionId, {
						callback: task.callback,
						callbackProcessId: task.callbackProcessId,
						callbackMessageCorrelationKey:
							task.callbackMessageCorrelationKey,
					})
				})
			}, 2000)
		})

		this.tasks = {}
	}

	map(
		elements: any[],
		mapFunctionId: string,
		{
			callback,
			callbackProcessId,
			callbackMessageCorrelationKey,
		}: MapTaskCallback = {}
	) {
		if (!this.ready) {
			console.log('Queuing this task')
			return this.queueTask(elements, mapFunctionId, {
				callback,
				callbackProcessId,
				callbackMessageCorrelationKey,
			})
		}
		const correlationKey = uuid()
		const workflowInstanceMd = this.zbc.createWorkflowInstance<
			MapReduceInput
		>('map-reduce', {
			callbackMessageCorrelationKey,
			callbackProcessId,
			elements,
			done: false,
			mapFunctionWorkflowId: mapFunctionId,
			correlationKey,
			accumulator: [],
		})
		this.tasks[correlationKey] = {
			correlationKey,
			callbackProcessId,
			callbackMessageCorrelationKey,
			callback,
			workflowInstanceMd,
		}
	}

	private createMapWorker() {
		return this.zbc.createWorker<MapReduceInput>(
			uuid(),
			'map',
			(job, complete) => {
				const { elements = [], mapFunctionWorkflowId } = job.variables
				const { correlationKey } = job.variables
				const tasks = elements.map(element =>
					this.zbc.createWorkflowInstance(mapFunctionWorkflowId, {
						element,
						correlationKey,
					})
				)
				console.log(`Spawned ${tasks.length} workflow instances`)
				complete()
			}
		)
	}
	/**
	 * This worker takes a single result from a map function, and adds it to the result set
	 */
	private createReducerWorker() {
		return this.zbc.createWorker<MapReduceOutput>(
			uuid(),
			'collect',
			(job, complete) => {
				const { accumulator, element, elements } = job.variables
				accumulator.push(element)
				const done = accumulator.length === elements.length
				console.log(
					`Collected: ${accumulator.length}/${elements.length}`
				) // @DEBUG
				complete({
					accumulator,
					done,
				})
			}
		)
	}

	/**
	 * This worker is called whenever the reduction is complete
	 */
	private createOutputWorker() {
		return this.zbc.createWorker<MapReduceOutput>(
			uuid(),
			'output',
			(job, complete) => {
				const {
					correlationKey,
					accumulator,
					callbackMessageCorrelationKey,
					callbackMessageName,
					callbackProcessId,
				} = job.variables
				if (callbackMessageCorrelationKey && callbackMessageName) {
					this.zbc.publishMessage({
						correlationKey: callbackMessageCorrelationKey,
						messageId: uuid(),
						name: callbackMessageName,
						timeToLive: 1000,
						variables: {
							result: accumulator,
						},
					})
				}
				if (callbackProcessId) {
					this.zbc.createWorkflowInstance(callbackProcessId, {
						result: accumulator,
					})
				}

				const task = this.tasks[correlationKey]
				if (task && task.callback) {
					task.callback(accumulator)
				}
				complete()
			}
		)
	}

	private queueTask(
		elements: any[],
		mapFunctionId: string,
		{
			callback,
			callbackProcessId,
			callbackMessageCorrelationKey,
		}: MapTaskCallback = {}
	) {
		this.queue.push({
			elements,
			callback,
			callbackProcessId,
			callbackMessageCorrelationKey,
			mapFunctionId,
		})
	}
}
