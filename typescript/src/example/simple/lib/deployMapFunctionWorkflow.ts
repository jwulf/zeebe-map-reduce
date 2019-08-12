import { ZBClient } from 'zeebe-node'

const mapFunctionWorkflow = './bpmn/do-processing.bpmn'

const zbc = new ZBClient('localhost')

export function deployMapFunctionWorkflow() {
	return zbc.deployWorkflow(mapFunctionWorkflow)
}
