import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'

interface Product {
  id: number
  name: string
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Error fetching product', error)
        return
      }
      setProduct(data)
    }

    fetchProduct()
  }, [id])

  if (!product) {
    return <div>Chargement...</div>
  }

  return (
    <div>
      <h2>{product.name}</h2>
      <pre>{JSON.stringify(product, null, 2)}</pre>
    </div>
  )
}

export default ProductDetail
