import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useNavigate } from 'react-router'
import { PolicyForm } from '../components/PolicyForm'
import { CREATE_POLICY, POLICIES, PORTFOLIO_REPORT } from '../lib/graphql'
import { errorMessage, todayIso } from '../lib/format'
import { toInput, type PolicyFormValues } from '../lib/policyForm'

const blank: PolicyFormValues = {
  policyNumber: '',
  insuredName: '',
  currency: 'USD',
  totalPremium: '',
  inceptionDate: todayIso(),
  frequency: 'MONTHLY',
  numberOfInstalments: '12',
}

export function CreatePolicyPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [createPolicy, { loading }] = useMutation(CREATE_POLICY, {
    // The list and dashboard change when a policy is added.
    refetchQueries: [POLICIES, PORTFOLIO_REPORT],
  })

  const submit = async (values: PolicyFormValues) => {
    setServerError(null)
    try {
      const { data } = await createPolicy({ variables: { input: toInput(values) } })
      if (data) navigate(`/policies/${data.createPolicy.policy.id}`)
    } catch (e) {
      setServerError(errorMessage(e))
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New policy</h1>
          <p className="subtle">The premium is split into instalments as soon as the policy is created.</p>
        </div>
      </div>
      <PolicyForm initial={blank} submitting={loading} serverError={serverError} onSubmit={submit}
        onCancel={() => navigate('/policies')} />
    </>
  )
}
