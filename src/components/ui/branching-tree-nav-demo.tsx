import { useState } from "react";

import { Download, Palette, Type } from "lucide-react";

import {
  TreeFolder,
  TreeItem,
  TreeSection,
  TreeView,
} from "@/components/ui/branching-tree-nav";

export default function TreeViewDemo() {
  const [selectedId, setSelectedId] = useState("announcement");

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-[240px] rounded-lg bg-card py-2">
        <TreeView selectedId={selectedId} onSelect={handleSelect}>
          <TreeSection title="Getting Started" defaultExpanded={true}>
            <TreeItem id="installation" label="Installation" icon={Download} href="/components/installation" />
          </TreeSection>

          <TreeSection title="Foundations" defaultExpanded={true}>
            <TreeItem id="color" label="Color" icon={Palette} href="/components/color" />
            <TreeItem id="typography" label="Typography" icon={Type} href="/components/typography" />
          </TreeSection>

          <TreeSection title="Base" defaultExpanded={true}>
            <TreeItem id="announcement" label="Announcement" href="/components/announcement" />
            <TreeItem id="avatar" label="Avatar" href="/components/avatar" />
            <TreeItem id="badge" label="Badge" href="/components/badge" />
            <TreeItem id="breadcrumb" label="Breadcrumb" href="/components/breadcrumb" />

            <TreeFolder id="buttons-folder" label="Buttons" defaultExpanded={false}>
              <TreeItem id="button" label="Button" href="/components/button" />
              <TreeItem id="button-group" label="Button Group" href="/components/button-group" />
              <TreeItem id="icon-button" label="Icon Button" href="/components/icon-button" />
              <TreeItem id="link-button" label="Link Button" href="/components/link-button" />
            </TreeFolder>

            <TreeItem id="carousel" label="Carousel" badge="NEW" href="/components/carousel" />
            <TreeItem id="checkbox" label="Checkbox" href="/components/checkbox" />
            <TreeItem id="chip" label="Chip" href="/components/chip" />
            <TreeItem id="close-button" label="Close Button" href="/components/close-button" />
            <TreeItem id="date-picker" label="Date Picker" href="/components/date-picker" />
            <TreeItem id="divider" label="Divider" href="/components/divider" />
            <TreeItem id="dropdown" label="Dropdown" href="/components/dropdown" />

            <TreeFolder id="forms-folder" label="Form Controls" defaultExpanded={false}>
              <TreeItem id="input" label="Input" href="/components/input" />
              <TreeItem id="input-otp" label="Input OTP" badge="NEW" href="/components/input-otp" />
              <TreeItem id="file-upload" label="File Upload" badge="NEW" href="/components/file-upload" />
              <TreeItem id="radio" label="Radio" href="/components/radio" />
            </TreeFolder>

            <TreeItem id="notification" label="Notification" badge="NEW" href="/components/notification" />
            <TreeItem id="pagination" label="Pagination" href="/components/pagination" />
          </TreeSection>
        </TreeView>
      </div>
    </div>
  );
}
