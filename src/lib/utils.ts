
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { isEqual, isObject, transform } from 'lodash';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deep difference between two objects.
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
function difference(object: any, base: any) {
  function changes(object: any, base: any) {
    return transform(object, function(result: any, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] = (isObject(value) && isObject(base[key])) ? changes(value, base[key]) : value;
      }
    });
  }
  return changes(object, base);
}

// This function converts a nested diff object into a dot-notation path object for Firestore updates
export function getChangedFields(oldState: object, newState: object): Record<string, any> {
    const diff = difference(newState, oldState);
    const result: Record<string, any> = {};

    function recurse(obj: any, path: string = '') {
        for (const key in obj) {
            const newPath = path ? `${path}.${key}` : key;
            if (isObject(obj[key]) && !Array.isArray(obj[key])) {
                 // If the nested object is a real object (not an array), recurse
                const nestedChanges = Object.keys(obj[key]).length > 0;
                if(nestedChanges) {
                    recurse(obj[key], newPath);
                } else {
                    // This handles cases like a dialog state changing from an object to null
                    result[newPath] = obj[key];
                }
            } else {
                // This handles primitive values and arrays
                result[newPath] = obj[key];
            }
        }
    }
    
    recurse(diff);
    return result;
}
