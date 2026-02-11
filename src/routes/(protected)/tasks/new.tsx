/**
 * New Task Route
 * 
 * Page for creating a new outreach task using the multi-step TaskForm.
 */

import { Show } from "solid-js";
import { useNavigate, useAction } from "@solidjs/router";
import { TaskForm } from "~/components/TaskForm";
import type { SaveTaskRequest } from "~/lib/schemas/ui";
import { createTaskAction } from "~/server/api/task-outreach";

export default function NewTask() {
  const navigate = useNavigate();
  const createTask = useAction(createTaskAction);

  const handleSave = async (request: SaveTaskRequest) => {
    try {
      const result = await createTask(request);
      if (!result.success) {
        alert(`Failed to create task: ${result.error}`);
        return;
      }
      
      // Navigate to the created task detail page
      navigate(`/tasks/${result.data}`);
    } catch (error: any) {
      console.error("Failed to create task:", error);
      alert(`Failed to create task: ${error.message || "Unknown error"}`);
    }
  };

  const handleCancel = () => {
    navigate("/tasks");
  };

  return (
    <TaskForm mode="NEW" onSave={handleSave} onCancel={handleCancel} />
  );
}
