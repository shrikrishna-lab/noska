'use client';

import * as React from 'react';
import { TactileTaskList } from './TactileTaskList';

export const PlayfulTodoList: React.FC = () => {
  return <TactileTaskList showOnboardingSection={true} />;
};

export const Component = PlayfulTodoList;
export default PlayfulTodoList;
