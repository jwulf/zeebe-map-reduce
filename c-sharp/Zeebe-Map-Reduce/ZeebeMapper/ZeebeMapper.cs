using System;
using System.Collections;

namespace ZeebeMapper
{
    public struct ZeebeMapperCallback
    {
        public delegate void Callback<in T>(T[] output);

        public string CallbackProcessId;
        public string CallbackMessageCorrelationKey;

    }
    
    struct ZeebeMapperRequest<T>
    {
        public T[] Elements;
        public string MapFunctionId;
        public ZeebeMapperCallback Callback;

    }
    public class ZeebeMapper
    {
        private Boolean Ready;
        private Queue Queue;
        public ZeebeMapper()
        {
            // initialise, then drain the Queue
            foreach ( ZeebeMapperRequest<> task in Queue )
                Map( task.Elements, task.MapFunctionId, task.Callback );
            Console.WriteLine();
        }

        public void Map<T>(T[] elements, string mapFunctionId, ZeebeMapperCallback callback)
        {
            if (!Ready)
            {
                Console.WriteLine("Queuing this task");
                ZeebeMapperRequest<T> request;
                request.Callback = callback;
                request.Elements = elements;
                request.MapFunctionId = mapFunctionId;
                QueueTask(request);
                return;
            }
            Console.WriteLine("Executing task");
            
        }

        private void QueueTask<T>(ZeebeMapperRequest<T> request)
        {
            Queue.Enqueue(request);
        }
    }
}