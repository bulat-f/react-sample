import { useCallback, useEffect, useRef, useState } from 'react';
import { CreateRenderTask, RenderTask, useCreateRenderTask, useGetRenderTask } from 'entities/RenderTask';
import { useDidUpdateEffect } from 'shared/lib/hooks/useDidUpdateEffect';

export const useGenerateResizes = () => {
  const [renderTaskId, setRenderTaskId] = useState<ID | null>(null);

  const promiseCallbacks = useRef({ resolve: (_creativeUrl: string) => {}, reject: () => {} });

  const { refetch, isUninitialized, currentData } = useGetRenderTask(renderTaskId || '', {
    skip: !renderTaskId,
    pollingInterval: 3000,
  });

  useEffect(() => {
    if (!isUninitialized) refetch();
  }, [refetch, isUninitialized]);

  const [createRenderTask] = useCreateRenderTask();

  useDidUpdateEffect(() => {
    if (!renderTaskId || !currentData) return;

    if (!['cancelled', 'done', 'error'].includes(currentData.state)) return;

    if (['done'].includes(currentData.state)) {
      const { creative_url } = currentData;
      if (creative_url) promiseCallbacks.current.resolve(creative_url!);
      else promiseCallbacks.current.reject();
    }

    if (['cancelled', 'error'].includes(currentData.state)) {
      promiseCallbacks.current.reject();
    }

    setRenderTaskId(null);
  }, [currentData, renderTaskId]);

  const runRenderTask = useCallback(
    async (renderTask: CreateRenderTask) => {
      if (!renderTask.ads_company_id) return;

      const createRenderTaskResponse = await createRenderTask(renderTask);

      const { data: task } = createRenderTaskResponse as { data: RenderTask };

      setRenderTaskId(task.id);

      return new Promise<string>((resolve, reject) => {
        promiseCallbacks.current = { resolve, reject };
      });
    },
    [createRenderTask],
  );

  return runRenderTask;
};
