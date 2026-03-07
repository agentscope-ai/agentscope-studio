import { memo } from 'react';
import { Route, Routes } from 'react-router-dom';

import RuntimeChatPage from '@/pages/ServicesPage/RuntimeChatPage';
import { RouterPath } from '@/pages/RouterPath.ts';

const ServicesPage = () => {
    return (
        <div className="w-full h-full">
            <Routes>
                <Route
                    path={RouterPath.SERVICES_RUNTIME_CHAT}
                    element={<RuntimeChatPage />}
                />
                <Route path="*" element={<RuntimeChatPage />} />
            </Routes>
        </div>
    );
};

export default memo(ServicesPage);
