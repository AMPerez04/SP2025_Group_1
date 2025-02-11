import * as React from "react";
import { cn } from "@/lib/utils";

// Update BaseRadioProps to be more specific
interface BaseRadioProps {
  value: string | number; // Allow both string and number values
}

// Update RadioGroupProps to handle both string and number values
interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'>, BaseRadioProps {
  onChange: (value: string | number) => void;
  children: React.ReactNode;
}

// Update RadioItemProps to properly extend ButtonHTMLAttributes
interface RadioItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'>, BaseRadioProps {
  isSelected?: boolean;
  onChange?: () => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onChange, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex space-x-2", className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<RadioItemProps>(child)) {
          return React.cloneElement(child, {
            isSelected: child.props.value === value,
            onChange: () => onChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  )
);

const RadioItem = React.forwardRef<HTMLButtonElement, RadioItemProps>(
  ({ isSelected, onChange, className, children, ...props }, ref) => (
    <button
      type="button"
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