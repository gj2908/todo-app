import { motion } from "framer-motion";

interface TodoProps {
  todo: any;
  toggleComplete: (id: string, completed: boolean) => void;
  deleteTodo?: (id: string) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700";
    case "medium":
      return "bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700";
    case "low":
      return "bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700";
    default:
      return "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-700";
  }
};

const getPriorityBadgeColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    case "low":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export default function TodoItem({
  todo,
  toggleComplete,
  deleteTodo,
}: TodoProps) {
  const isOverdue =
    todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-2 rounded-lg shadow transition ${getPriorityColor(todo.priority)} ${
        isOverdue ? "border-red-500" : ""
      } dark:text-gray-100`}
    >
      <div className="flex items-start gap-3 flex-1 w-full md:w-auto">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleComplete(todo._id, !todo.completed)}
          className="mt-1 w-5 h-5 cursor-pointer"
        />
        <div className="flex-1">
          <div className="flex gap-2 items-center flex-wrap">
            <span
              className={`text-lg font-semibold ${
                todo.completed
                  ? "line-through text-gray-400"
                  : "dark:text-white"
              }`}
            >
              {todo.title}
            </span>
            {todo.priority && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${getPriorityBadgeColor(
                  todo.priority,
                )}`}
              >
                {todo.priority.toUpperCase()}
              </span>
            )}
            {todo.category && (
              <span className="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-100 px-2 py-1 rounded">
                {todo.category}
              </span>
            )}
            {isOverdue && (
              <span className="text-xs bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100 px-2 py-1 rounded">
                Overdue
              </span>
            )}
          </div>
          {todo.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {todo.description}
            </p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {todo.dueDate && (
              <span>📅 {new Date(todo.dueDate).toLocaleDateString()}</span>
            )}
            {todo.tags && todo.tags.length > 0 && (
              <div className="flex gap-1">
                {todo.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 md:mt-0 w-full md:w-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toggleComplete(todo._id, !todo.completed)}
          className={`${
            todo.completed
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-green-500 hover:bg-green-600"
          } text-white px-3 py-2 rounded text-sm font-semibold transition`}
        >
          {todo.completed ? "Undo" : "Complete"}
        </motion.button>
        {deleteTodo && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => deleteTodo(todo._id)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-semibold transition"
          >
            Delete
          </motion.button>
        )}
      </div>
    </motion.li>
  );
}
