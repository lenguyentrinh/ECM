import { useAction, useResourceCache } from "@/shared/api/resource/index.ts";
import { createCourse, deleteCourse, updateCourse } from "./courseApi.ts";
import type { UpsertCoursePayload } from "./types.ts";

/** Create / update / delete mutations for courses; refreshes cached course data on success. */
export function useCourseMutations() {
  const cache = useResourceCache();
  const refresh = () => {
    void cache.invalidate(["course-schedule"]);
    return cache.invalidate(["courses"]);
  };

  const create = useAction({
    mutationFn: (payload: UpsertCoursePayload) => createCourse(payload),
    onSuccess: refresh,
  });

  const update = useAction({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertCoursePayload }) =>
      updateCourse(id, payload),
    onSuccess: (_res, { id }) => {
      void cache.invalidate(["course", id]);
      return refresh();
    },
  });

  const remove = useAction({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: refresh,
  });

  return {
    create,
    update,
    remove,
    submitting: create.isPending || update.isPending || remove.isPending,
  };
}
