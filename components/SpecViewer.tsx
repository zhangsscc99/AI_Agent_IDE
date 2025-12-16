'use client';

import React from 'react';
import { ModuleSpec, FunctionSpec } from '@/lib/sdd/types';

interface SpecViewerProps {
  spec: ModuleSpec;
  onGenerateCode?: (spec: ModuleSpec) => void;
}

export function SpecViewer({ spec, onGenerateCode }: SpecViewerProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{spec.name}</h2>
            <p className="text-sm text-gray-500">Version {spec.version}</p>
          </div>
          {onGenerateCode && (
            <button
              onClick={() => onGenerateCode(spec)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Generate Code
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">{spec.description}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Functions */}
        {spec.functions && spec.functions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Functions</h3>
            <div className="space-y-4">
              {spec.functions.map((func, index) => (
                <FunctionSpecCard key={index} func={func} />
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {spec.classes && spec.classes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Classes</h3>
            <div className="space-y-4">
              {spec.classes.map((cls, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">{cls.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
                  
                  {cls.properties && cls.properties.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Properties:</p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        {cls.properties.map((prop, i) => (
                          <li key={i}>
                            <span className="font-mono text-xs">{prop.name}</span>
                            <span className="text-gray-400 mx-1">:</span>
                            <span className="text-blue-600">{prop.type}</span>
                            {!prop.required && <span className="text-gray-400 ml-1">(optional)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cls.methods && cls.methods.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Methods:</p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        {cls.methods.map((method, i) => (
                          <li key={i}>
                            <span className="font-mono text-xs">{method.name}()</span>
                            <span className="text-gray-400 mx-1">→</span>
                            <span className="text-blue-600">{method.returns.type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {spec.dependencies && spec.dependencies.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Dependencies</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {spec.dependencies.map((dep, index) => (
                <li key={index}>{dep}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function FunctionSpecCard({ func }: { func: FunctionSpec }) {
  return (
    <div className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-mono text-sm font-semibold text-gray-900">
          {func.name}()
        </h4>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
          function
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{func.description}</p>

      {/* Parameters */}
      {func.parameters && func.parameters.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Parameters:</p>
          <div className="space-y-1">
            {func.parameters.map((param, index) => (
              <div key={index} className="text-xs text-gray-600 ml-2">
                <span className="font-mono text-purple-600">{param.name}</span>
                <span className="text-gray-400 mx-1">:</span>
                <span className="text-blue-600">{param.type}</span>
                {!param.required && <span className="text-gray-400 ml-1">(optional)</span>}
                {param.default !== undefined && (
                  <span className="text-gray-400 ml-1">= {JSON.stringify(param.default)}</span>
                )}
                <p className="text-gray-500 ml-4 mt-0.5">{param.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returns */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-700 mb-1">Returns:</p>
        <div className="text-xs text-gray-600 ml-2">
          <span className="text-blue-600">{func.returns.type}</span>
          <span className="text-gray-400 mx-1">-</span>
          <span>{func.returns.description}</span>
        </div>
      </div>

      {/* Examples */}
      {func.examples && func.examples.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">Examples:</p>
          {func.examples.map((example, index) => (
            <div key={index} className="bg-gray-50 rounded p-2 text-xs font-mono mt-1">
              <div className="text-gray-600">
                {func.name}({JSON.stringify(example.input)})
              </div>
              <div className="text-gray-400 my-1">→</div>
              <div className="text-green-600">
                {JSON.stringify(example.output)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {func.constraints && func.constraints.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold text-gray-700 mb-1">Constraints:</p>
          <ul className="list-disc list-inside text-xs text-gray-500 space-y-0.5">
            {func.constraints.map((constraint, index) => (
              <li key={index}>{constraint}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SpecViewer;

