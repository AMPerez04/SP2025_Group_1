import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onChange: (value: string) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onChange, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex space-x-2", className)}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) &&
        React.cloneElement(child, {
          isSelected: child.props.value === value,
          onChange: () => onChange(child.props.value),
        })
      )}
    </div>
  )
);
RadioGroup.displayName = "RadioGroup";

interface RadioItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  isSelected?: boolean;
  onChange?: () => void;
}

const RadioItem = React.forwardRef<HTMLButtonElement, RadioItemProps>(
  ({ isSelected, onChange, className, children, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onChange}
      className={cn(
        "px-4 py-2 rounded-md transition-colors duration-200",
        isSelected
          ? "bg-blue-500 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
RadioItem.displayName = "RadioItem";

export { RadioGroup, RadioItem };