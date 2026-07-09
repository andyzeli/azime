import { cn } from "@/lib/utils";
import { motion } from "framer-motion"; // For smooth animations
import * as Slider from "@radix-ui/react-slider";
import * as Tooltip from "@radix-ui/react-tooltip";
interface ScaleInputProps {
  value: number;
  onChange: (value: number) => void;
  labels: string[];
  variant: "pills" | "slider";
  colorGradient?: boolean;
  size?: "sm" | "md" | "lg";
}

const ScaleInput = ({
  value,
  onChange,
  labels,
  variant = "pills",
  colorGradient = false,
  size = "md",
}: ScaleInputProps) => {
  const getGradientColor = (index: number) => {
    if (!colorGradient) return "bg-blue-500";
    const total = labels.length - 1;
    if (total === 0) return "bg-blue-500";

    // Color gradient from red to green
    if (total === 1) return index === 0 ? "bg-red-500" : "bg-green-500";
    if (index === 0) return "bg-red-500";
    if (index === total) return "bg-green-500";
    return "bg-amber-500";
  };

  const sizeClasses = {
    sm: "text-xs py-1 px-3",
    md: "text-sm py-2 px-4",
    lg: "text-base py-3 px-6",
  }[size];

  if (variant === "pills") {
    return (
      <div className="flex gap-2 items-center">
        {labels.map((label, index) => (
          <button
            key={index}
            onClick={() => onChange(index)}
            className={cn(
              "relative rounded-full font-medium transition-all duration-200",
              sizeClasses,
              value === index
                ? cn(getGradientColor(index), "text-white")
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        max={labels.length - 1}
        step={1}
        onValueChange={([newValue]) => onChange(newValue)}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>

        {/* Tick marks */}

        <Tooltip.Provider>
          <div className="absolute w-full flex justify-between px-[10px] mt-3">
            {labels.map((label, index) => (
              <Tooltip.Root key={index}>
                <Tooltip.Trigger asChild>
                  <div
                    className="relative -mt-4 group cursor-pointer"
                    onClick={() => onChange(index)}
                  >
                    {/* Invisible larger hit area */}
                    <div className="absolute w-6 h-8 -left-3 -top-2" />

                    {/* Visible tick mark */}
                    <div
                      className={cn(
                        "w-[2px] h-4 rounded-full transition-all duration-200",
                        index <= value ? "bg-blue-500" : "bg-gray-300",
                        "group-hover:h-5 group-hover:bg-blue-400"
                      )}
                    />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
                    sideOffset={5}
                  >
                    {label}
                    <Tooltip.Arrow className="fill-gray-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ))}
          </div>
        </Tooltip.Provider>

        <Slider.Thumb className="block w-5 h-5 bg-white shadow-lg rounded-full border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform hover:scale-110" />
      </Slider.Root>

      {/* Dynamic label */}
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="min-w-[120px] text-sm font-medium text-gray-700"
      >
        {labels[value]}
      </motion.div>
    </div>
  );
};

export default ScaleInput;
