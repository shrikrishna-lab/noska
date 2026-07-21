import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HardDrive } from "lucide-react";

export function ContentFiles() {
  return (
    <div className="p-6">
      <PageHeader title="Files" description="Uploaded files and media assets" />
      <EmptyState
        title="File management"
        description="Uploaded files and media assets are managed through the platform's storage system. File tracking will appear here once integrated."
        icon={HardDrive}
      />
    </div>
  );
}
