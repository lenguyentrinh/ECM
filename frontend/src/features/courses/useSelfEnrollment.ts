import { useAction, useResource, useResourceCache } from "@/shared/api/resource/index.ts";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/shared/api/error.ts";
import { cancelSelfEnrollment, enrollSelf, getUserEnrollments } from "./courseApi.ts";

/**
 * A student's own registration for one course: whether they are enrolled (ACTIVE) plus register / cancel actions.
 * Shares the ["classes","enrollments",userId] cache with the student's class list, so both stay in step.
 */
export function useSelfEnrollment(courseId: string, userId: string | undefined, isStudent: boolean) {
  const cache = useResourceCache();

  const enrollmentsQ = useResource({
    queryKey: ["classes", "enrollments", userId],
    queryFn: () => getUserEnrollments(userId ?? ""),
    enabled: !!userId && isStudent,
  });

  const enrolled = (enrollmentsQ.data ?? []).some(
    (e) => e.enrollmentStatus === "ACTIVE" && e.course.id === courseId,
  );

  const refresh = () =>
    Promise.all([
      cache.invalidate(["classes"]),
      cache.invalidate(["course", courseId]),
      cache.invalidate(["courses"]),
    ]);

  const register = useAction({
    mutationFn: () => enrollSelf(courseId),
    onSuccess: () => {
      toast.success("Đăng ký khoá học thành công.");
      return refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Không đăng ký được khoá học. Vui lòng thử lại.")),
  });

  const cancel = useAction({
    mutationFn: () => cancelSelfEnrollment(courseId),
    onSuccess: () => {
      toast.success("Đã huỷ đăng ký khoá học.");
      return refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Không huỷ được đăng ký. Vui lòng thử lại.")),
  });

  return { enrolled, loading: enrollmentsQ.isLoading, register, cancel };
}
