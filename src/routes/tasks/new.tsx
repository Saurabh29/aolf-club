/**
 * New Task Route
 * 
 * Page for creating a new outreach task using the multi-step TaskForm.
 */

import { useNavigate } from "@solidjs/router";
import { TaskForm } from "~/components/TaskForm";
import type { SaveTaskRequest } from "~/lib/schemas/ui";

export default function NewTask() {
  const navigate = useNavigate();

  const handleSave = async (request: SaveTaskRequest) => {
    console.log("Saving new task:", request);
    
    // Backend integration pending
    alert(
      `Task created:\n\n` +
        `Title: ${request.definition.title}\n` +
        `Location: ${request.definition.locationId}\n` +
        `Targets: ${request.targetUserIds.length}\n` +
        `Assignments: ${request.assignments?.length ?? 0}\n\n` +
        `Backend integration pending.`
    );

    // Navigate to tasks list
    navigate("/tasks");
  };

  const handleCancel = () => {
    navigate("/tasks");
  };

  return <TaskForm mode="NEW" onSave={handleSave} onCancel={handleCancel} />;
}
