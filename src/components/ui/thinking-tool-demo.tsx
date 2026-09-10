import { ThinkingTool } from "./thinking-tool";

export default function ThinkingToolDemo() {
  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-background p-8 overflow-hidden">
      <div className="w-fit">
        <ThinkingTool state="thinking" content="Draft" defaultOpen />
      </div>
    </div>
  );
}
